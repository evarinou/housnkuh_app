/**
 * @file invoiceCalculationService.ts
 * @purpose Service for calculating monthly vendor costs and invoice amounts
 * @created 2025-08-21
 * @modified 2025-08-21
 */

import { Types } from 'mongoose';
import Vertrag from '../models/Vertrag';
import User from '../models/User';
import { ZUSATZLEISTUNGEN_PREISE } from '../models/Vertrag';
import logger from '../utils/logger';

export interface MonthlyChargeItem {
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'mietfach' | 'zusatzleistung' | 'sonstiges';
  referenceId?: Types.ObjectId;
  period?: {
    from: Date;
    to: Date;
  };
}

export interface MonthlyChargesSummary {
  vendorId: Types.ObjectId;
  month: number;
  year: number;
  items: MonthlyChargeItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  isInTrialPeriod: boolean;
}

export enum ProrationMethod {
  DAILY_ACTUAL = 'daily_actual',      // amount / actual days in month * days used
  DAILY_30_DAY = 'daily_30_day',      // amount / 30 * days used (assumes 30-day month)
  DAILY_STANDARD = 'daily_standard'   // amount / days in month * days used (same as DAILY_ACTUAL)
}

export interface ProrationBreakdown {
  proratedAmount: number;
  daysUsed: number;
  totalDays: number;
  dailyRate: number;
  method: ProrationMethod;
  originalAmount: number;
  startDate: Date;
  endDate: Date;
  isFullMonth: boolean;
}

export class InvoiceCalculationService {
  /**
   * Calculate monthly charges for a vendor considering all active contracts
   * @param vendorId - The vendor's user ID
   * @param month - Month (1-12)
   * @param year - Year (YYYY)
   * @returns Monthly charges summary or null if vendor is in trial period
   */
  async calculateMonthlyCharges(
    vendorId: string | Types.ObjectId, 
    month: number, 
    year: number
  ): Promise<MonthlyChargesSummary | null> {
    // logger.info(`🧮 Calculating monthly charges for vendor ${vendorId}, ${month}/${year}`);

    // Validate inputs
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }
    if (year < 2020 || year > 2100) {
      throw new Error('Year must be between 2020 and 2100');
    }

    const vendorObjectId = typeof vendorId === 'string' ? new Types.ObjectId(vendorId) : vendorId;

    // Get all active contracts for the vendor
    const contracts = await Vertrag.find({
      user: vendorObjectId,
      status: { $in: ['active', 'scheduled'] }
    }).exec();

    if (contracts.length === 0) {
      logger.info(`No active contracts found for vendor ${vendorId}`);
      return null;
    }

    // Create billing period dates
    const periodStart = new Date(year, month - 1, 1); // First day of month
    const periodEnd = new Date(year, month, 0); // Last day of month
    periodEnd.setHours(23, 59, 59, 999);

    const items: MonthlyChargeItem[] = [];
    let isInTrialPeriod = false;

    // Process each contract
    for (const contract of contracts) {
      const trialAdjustment = await this.calculateTrialAdjustment(contract, { start: periodStart, end: periodEnd });
      
      if (trialAdjustment.isInTrialPeriod) {
        isInTrialPeriod = true;
        continue; // Skip billing for contracts still in trial
      }

      // Calculate base contract charges
      if (contract.totalMonthlyPrice > 0) {
        const proratedAmount = this.calculateProratedAmount(
          contract.totalMonthlyPrice,
          trialAdjustment.billingStartDate || periodStart,
          periodEnd
        );

        if (proratedAmount > 0) {
          items.push({
            description: `Mietfach Service - ${month}/${year}`,
            quantity: 1,
            unitPrice: proratedAmount,
            type: 'mietfach',
            referenceId: contract._id as Types.ObjectId,
            period: {
              from: trialAdjustment.billingStartDate || periodStart,
              to: periodEnd
            }
          });
        }
      }

      // Calculate zusatzleistungen charges
      if (contract.zusatzleistungen?.lagerservice) {
        const proratedAmount = this.calculateProratedAmount(
          ZUSATZLEISTUNGEN_PREISE.lagerservice,
          trialAdjustment.billingStartDate || periodStart,
          periodEnd
        );

        if (proratedAmount > 0) {
          items.push({
            description: `Lagerservice - ${month}/${year}`,
            quantity: 1,
            unitPrice: proratedAmount,
            type: 'zusatzleistung',
            referenceId: contract._id as Types.ObjectId,
            period: {
              from: trialAdjustment.billingStartDate || periodStart,
              to: periodEnd
            }
          });
        }
      }

      if (contract.zusatzleistungen?.versandservice) {
        const proratedAmount = this.calculateProratedAmount(
          ZUSATZLEISTUNGEN_PREISE.versandservice,
          trialAdjustment.billingStartDate || periodStart,
          periodEnd
        );

        if (proratedAmount > 0) {
          items.push({
            description: `Versandservice - ${month}/${year}`,
            quantity: 1,
            unitPrice: proratedAmount,
            type: 'zusatzleistung',
            referenceId: contract._id as Types.ObjectId,
            period: {
              from: trialAdjustment.billingStartDate || periodStart,
              to: periodEnd
            }
          });
        }
      }
    }

    // If all contracts are in trial period, return null
    if (isInTrialPeriod && items.length === 0) {
      // logger.info(`Vendor ${vendorId} is still in trial period for ${month}/${year}`);
      return null;
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxRate = 0.19; // 19% VAT
    const taxAmount = this.getTaxAmount(subtotal, taxRate);
    const totalAmount = subtotal + taxAmount;

    return {
      vendorId: vendorObjectId,
      month,
      year,
      items,
      subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimal places
      taxRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      isInTrialPeriod: false
    };
  }

  /**
   * Check if a vendor is in their trial period and should not be billed
   * @param vendor - The vendor user document
   * @param billingDate - The date for which billing is being calculated
   * @returns Trial status information with detailed reasoning
   */
  async isInTrialPeriod(vendor: any, billingDate: Date): Promise<{
    isInTrial: boolean;
    reason: string;
    trialEndsAt: Date | null;
    contractsInTrial: any[];
    contractsReadyForBilling: any[];
  }> {
    logger.info('Checking trial status for vendor', { vendorId: vendor._id, billingDate: billingDate.toISOString() });

    // Get all active contracts for the vendor
    const contracts = await Vertrag.find({
      user: vendor._id,
      status: { $in: ['active', 'scheduled'] }
    }).exec();

    if (contracts.length === 0) {
      return {
        isInTrial: false,
        reason: 'No active contracts found',
        trialEndsAt: null,
        contractsInTrial: [],
        contractsReadyForBilling: []
      };
    }

    const contractsInTrial: any[] = [];
    const contractsReadyForBilling: any[] = [];
    let earliestTrialEnd: Date | null = null;

    // Check each contract's trial status
    for (const contract of contracts) {
      const contractTrialStatus = await this.isContractInTrialPeriod(contract, billingDate);
      
      if (contractTrialStatus.isInTrial) {
        contractsInTrial.push({
          contractId: contract._id,
          reason: contractTrialStatus.reason,
          trialEndsAt: contractTrialStatus.trialEndsAt
        });
        
        // Track earliest trial end date
        if (contractTrialStatus.trialEndsAt) {
          if (!earliestTrialEnd || contractTrialStatus.trialEndsAt < earliestTrialEnd) {
            earliestTrialEnd = contractTrialStatus.trialEndsAt;
          }
        }
      } else {
        contractsReadyForBilling.push({
          contractId: contract._id,
          reason: contractTrialStatus.reason
        });
      }
    }

    // Check vendor-level trial status
    const vendorTrialStatus = this.checkVendorLevelTrial(vendor, billingDate);
    
    // If vendor is in trial at user level, override contract-level checks
    if (vendorTrialStatus.isInTrial) {
      return {
        isInTrial: true,
        reason: vendorTrialStatus.reason,
        trialEndsAt: vendorTrialStatus.trialEndsAt,
        contractsInTrial: contracts.map(c => ({
          contractId: c._id,
          reason: 'Vendor in trial period'
        })),
        contractsReadyForBilling: []
      };
    }

    // If all contracts are in trial
    if (contractsInTrial.length > 0 && contractsReadyForBilling.length === 0) {
      return {
        isInTrial: true,
        reason: `All ${contractsInTrial.length} contracts are in trial period`,
        trialEndsAt: earliestTrialEnd,
        contractsInTrial,
        contractsReadyForBilling
      };
    }

    // If some contracts are ready for billing
    if (contractsReadyForBilling.length > 0) {
      return {
        isInTrial: false,
        reason: `${contractsReadyForBilling.length} contracts ready for billing, ${contractsInTrial.length} in trial`,
        trialEndsAt: earliestTrialEnd,
        contractsInTrial,
        contractsReadyForBilling
      };
    }

    // Default case - no contracts ready
    return {
      isInTrial: true,
      reason: 'No contracts ready for billing',
      trialEndsAt: earliestTrialEnd,
      contractsInTrial,
      contractsReadyForBilling
    };
  }

  /**
   * Check vendor-level trial status
   * @param vendor - The vendor user document
   * @param billingDate - The date to check against
   * @returns Vendor trial status
   */
  private checkVendorLevelTrial(vendor: any, billingDate: Date): {
    isInTrial: boolean;
    reason: string;
    trialEndsAt: Date | null;
  } {
    // Check registration status
    if (vendor.registrationStatus === 'preregistered') {
      return {
        isInTrial: true,
        reason: 'Vendor is still in pre-registration status',
        trialEndsAt: null
      };
    }

    if (vendor.registrationStatus === 'trial_active') {
      const trialEnd = vendor.trialEndDate;
      if (trialEnd && billingDate <= trialEnd) {
        return {
          isInTrial: true,
          reason: 'Vendor is in active trial period',
          trialEndsAt: trialEnd
        };
      } else if (trialEnd && billingDate > trialEnd) {
        return {
          isInTrial: false,
          reason: 'Vendor trial period has expired',
          trialEndsAt: trialEnd
        };
      }
    }

    if (vendor.registrationStatus === 'trial_expired') {
      return {
        isInTrial: false,
        reason: 'Vendor trial has expired',
        trialEndsAt: vendor.trialEndDate
      };
    }

    if (vendor.registrationStatus === 'cancelled') {
      return {
        isInTrial: true,
        reason: 'Vendor account is cancelled',
        trialEndsAt: null
      };
    }

    // Default to not in trial for active status
    return {
      isInTrial: false,
      reason: 'Vendor has active status',
      trialEndsAt: null
    };
  }

  /**
   * Check if a specific contract is in trial period
   * @param contract - The contract document
   * @param billingDate - The date to check against
   * @returns Contract trial status
   */
  private async isContractInTrialPeriod(contract: any, billingDate: Date): Promise<{
    isInTrial: boolean;
    reason: string;
    trialEndsAt: Date | null;
  }> {
    // Non-trial contracts are never in trial
    if (!contract.istProbemonatBuchung) {
      return {
        isInTrial: false,
        reason: 'Contract is not a trial booking',
        trialEndsAt: null
      };
    }

    // Trial contract without payment obligation date is still in trial
    if (!contract.zahlungspflichtigAb) {
      return {
        isInTrial: true,
        reason: 'Trial contract with no payment obligation date set',
        trialEndsAt: null
      };
    }

    const paymentObligationDate = new Date(contract.zahlungspflichtigAb);

    // If billing date is before payment obligation, still in trial
    if (billingDate < paymentObligationDate) {
      return {
        isInTrial: true,
        reason: `Payment obligation starts ${paymentObligationDate.toISOString().split('T')[0]}`,
        trialEndsAt: paymentObligationDate
      };
    }

    // Payment obligation has started
    return {
      isInTrial: false,
      reason: `Payment obligation started ${paymentObligationDate.toISOString().split('T')[0]}`,
      trialEndsAt: paymentObligationDate
    };
  }

  /**
   * Calculate prorated amount for partial billing periods with detailed breakdown
   * @param amount - Full monthly amount
   * @param startDate - Billing start date
   * @param endDate - Billing end date (usually end of month)
   * @param method - Proration method to use (defaults to DAILY_ACTUAL)
   * @returns Prorated amount (backward compatibility) or ProrationBreakdown if requested
   */
  calculateProratedAmount(amount: number, startDate: Date, endDate: Date): number;
  calculateProratedAmount(amount: number, startDate: Date, endDate: Date, method: ProrationMethod): ProrationBreakdown;
  calculateProratedAmount(
    amount: number, 
    startDate: Date, 
    endDate: Date, 
    method: ProrationMethod = ProrationMethod.DAILY_ACTUAL
  ): number | ProrationBreakdown {
    // Input validation
    if (amount <= 0) {
      const breakdown: ProrationBreakdown = {
        proratedAmount: 0,
        daysUsed: 0,
        totalDays: 0,
        dailyRate: 0,
        method,
        originalAmount: amount,
        startDate,
        endDate,
        isFullMonth: false
      };
      return arguments.length <= 3 ? 0 : breakdown;
    }

    if (startDate >= endDate) {
      const breakdown: ProrationBreakdown = {
        proratedAmount: 0,
        daysUsed: 0,
        totalDays: 0,
        dailyRate: 0,
        method,
        originalAmount: amount,
        startDate,
        endDate,
        isFullMonth: false
      };
      return arguments.length <= 3 ? 0 : breakdown;
    }

    // Use UTC methods to avoid timezone issues
    const startDay = startDate.getUTCDate();
    const startMonth = startDate.getUTCMonth();
    const startYear = startDate.getUTCFullYear();
    
    const endDay = endDate.getUTCDate();
    const endMonth = endDate.getUTCMonth();
    const endYear = endDate.getUTCFullYear();

    let totalDays: number;
    let daysUsed: number;
    let dailyRate: number;
    let proratedAmount: number;

    // Calculate based on proration method
    switch (method) {
      case ProrationMethod.DAILY_30_DAY:
        totalDays = 30;
        // Calculate days used with 30-day assumption
        if (startYear === endYear && startMonth === endMonth) {
          daysUsed = endDay - startDay + 1;
        } else {
          // For cross-month, use time-based calculation but cap at 30
          const msPerDay = 1000 * 60 * 60 * 24;
          const timeDiff = endDate.getTime() - startDate.getTime();
          daysUsed = Math.min(Math.ceil(timeDiff / msPerDay), 30);
        }
        dailyRate = amount / 30;
        proratedAmount = Math.min(dailyRate * daysUsed, amount);
        break;

      case ProrationMethod.DAILY_ACTUAL:
      case ProrationMethod.DAILY_STANDARD:
      default:
        // Calculate actual days in the billing month (end month for same-month scenarios)
        totalDays = new Date(endYear, endMonth + 1, 0).getDate();
        
        // Special case: if start and end are in the same month and year
        if (startYear === endYear && startMonth === endMonth) {
          // Count inclusive days: from startDay to endDay
          daysUsed = endDay - startDay + 1;
          dailyRate = amount / totalDays;
          proratedAmount = (amount * daysUsed) / totalDays;
          
          logger.debug('Prorated calculation (same month)', {
            method,
            amount,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            startDay,
            endDay,
            daysUsed,
            totalDays,
            dailyRate,
            proratedAmount
          });
        } else {
          // For cross-month scenarios, use time-based calculation
          const msPerDay = 1000 * 60 * 60 * 24;
          const timeDiff = endDate.getTime() - startDate.getTime();
          daysUsed = Math.ceil(timeDiff / msPerDay);
          const effectiveDays = Math.min(daysUsed, totalDays);
          dailyRate = amount / totalDays;
          proratedAmount = (amount * effectiveDays) / totalDays;

          logger.debug('Cross-month prorated calculation', {
            method,
            amount,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            timeDiff,
            daysUsed,
            effectiveDays,
            totalDays,
            dailyRate,
            proratedAmount
          });
        }
        break;
    }

    // Apply banker's rounding for financial accuracy
    proratedAmount = Math.max(0, Math.round(proratedAmount * 100) / 100);

    // Check if this is a full month
    const isFullMonth = (startYear === endYear && startMonth === endMonth && 
                        startDay === 1 && endDay === totalDays) ||
                       (daysUsed >= totalDays && proratedAmount >= amount * 0.99);

    const breakdown: ProrationBreakdown = {
      proratedAmount,
      daysUsed,
      totalDays,
      dailyRate: Math.round(dailyRate * 10000) / 10000, // Round to 4 decimal places
      method,
      originalAmount: amount,
      startDate,
      endDate,
      isFullMonth
    };

    // Return breakdown if method parameter was provided, otherwise return just the amount for backward compatibility
    return arguments.length <= 3 ? proratedAmount : breakdown;
  }

  /**
   * Calculate trial period adjustments for a contract
   * @param contract - The contract to analyze
   * @param billingPeriod - The billing period to check
   * @returns Trial adjustment information
   */
  async calculateTrialAdjustment(
    contract: any, 
    billingPeriod: { start: Date; end: Date }
  ): Promise<{
    isInTrialPeriod: boolean;
    billingStartDate: Date | null;
    trialEndDate: Date | null;
  }> {
    // Non-trial contracts are always billable
    if (!contract.istProbemonatBuchung) {
      return {
        isInTrialPeriod: false,
        billingStartDate: contract.scheduledStartDate > billingPeriod.start ? contract.scheduledStartDate : billingPeriod.start,
        trialEndDate: null
      };
    }

    // For trial contracts, check zahlungspflichtigAb date
    if (!contract.zahlungspflichtigAb) {
      // Trial without payment obligation date - still in trial
      return {
        isInTrialPeriod: true,
        billingStartDate: null,
        trialEndDate: null
      };
    }

    const paymentObligationDate = new Date(contract.zahlungspflichtigAb);

    // If payment obligation date is after the billing period, still in trial
    if (paymentObligationDate > billingPeriod.end) {
      return {
        isInTrialPeriod: true,
        billingStartDate: null,
        trialEndDate: paymentObligationDate
      };
    }

    // If payment obligation date is before or during billing period, calculate billing start
    const billingStartDate = paymentObligationDate > billingPeriod.start 
      ? paymentObligationDate 
      : billingPeriod.start;

    return {
      isInTrialPeriod: false,
      billingStartDate,
      trialEndDate: paymentObligationDate
    };
  }

  /**
   * Calculate tax amount for given subtotal and tax rate
   * @param subtotal - Amount before tax
   * @param taxRate - Tax rate as decimal (0.19 for 19%)
   * @returns Tax amount
   */
  getTaxAmount(subtotal: number, taxRate: number): number {
    if (subtotal <= 0 || taxRate <= 0) return 0;
    
    const taxAmount = subtotal * taxRate;
    return Math.round(taxAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate invoice data for a specific vendor and period
   * @param vendorId - The vendor ID
   * @param year - The year
   * @param month - The month (1-12)
   * @returns Invoice calculation data
   */
  /**
   * Calculate invoice data for a specific vendor and period
   * @param vendorId - The vendor ID
   * @param year - The year
   * @param month - The month (1-12)
   * @returns Invoice calculation data
   */
  async calculateInvoiceForPeriod(vendorId: string, year: number, month: number): Promise<{
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      type: 'mietfach' | 'zusatzleistung' | 'sonstiges';
      referenceId?: any;
      period?: {
        from?: Date;
        to?: Date;
      };
    }>;
    subtotal: number;
    tax: number;
    totalAmount: number;
  }> {
    try {
      // Calculate monthly charges for the vendor (note: month and year parameters are swapped in the service)
      const monthlyCharges = await this.calculateMonthlyCharges(vendorId, month, year);
      
      // If no charges (e.g., still in trial period), return empty invoice
      if (!monthlyCharges || !monthlyCharges.items || monthlyCharges.items.length === 0) {
        return {
          items: [],
          subtotal: 0,
          tax: 0,
          totalAmount: 0
        };
      }
      
      // Convert MonthlyChargeItem[] to invoice items format
      const items = monthlyCharges.items.map(chargeItem => ({
        description: chargeItem.description,
        quantity: chargeItem.quantity,
        unitPrice: chargeItem.unitPrice,
        totalPrice: chargeItem.quantity * chargeItem.unitPrice,
        type: chargeItem.type,
        referenceId: chargeItem.referenceId,
        period: chargeItem.period
      }));

      return {
        items,
        subtotal: monthlyCharges.subtotal,
        tax: monthlyCharges.taxAmount,
        totalAmount: monthlyCharges.totalAmount
      };
      
    } catch (error) {
      logger.error('Error calculating invoice for period', { month, year, vendorId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const invoiceCalculationService = new InvoiceCalculationService();
export default invoiceCalculationService;