/**
 * @file Revenue Service for the housnkuh marketplace application
 * @description Comprehensive revenue calculation and analysis service
 * Handles revenue calculations, projections, analytics, and reporting for the marketplace
 * including historical data, future projections, and detailed Mietfach analysis
 */

import mongoose from 'mongoose';
import { cached, CacheInvalidator } from '../utils/queryCache';
import { IMonthlyRevenue, IMietfachRevenue, IVertrag } from '../models/modelTypes';
import Vertrag from '../models/Vertrag';
import Mietfach from '../models/Mietfach';
import MonthlyRevenue from '../models/MonthlyRevenue';
import logger from '../utils/logger';

/**
 * Revenue Service for comprehensive revenue management
 * @description Handles all revenue calculations, projections, and analytics
 */
export class RevenueService {
  /**
   * Calculates future revenue projections for a specific month
   * @description Generates revenue projections based on scheduled contracts and trial conversions
   * @param year - Target year for projection
   * @param month - Target month for projection (1-12)
   * @param includeTrialRevenue - Whether to include trial revenue in calculations
   * @returns Promise<IMonthlyRevenue> - Monthly revenue projection with metadata
   * @complexity O(n) where n is number of contracts in period
   * @security Read-only operation with comprehensive logging
   */
  async calculateFutureRevenue(year: number, month: number, includeTrialRevenue: boolean = false): Promise<IMonthlyRevenue> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    logger.info(`🔍 Calculating future revenue projection for ${year}-${month}:`);
    logger.info(`🔍 Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get all contracts that will be active during this future month
    const query = {
      status: { $in: ['active', 'scheduled'] },
      scheduledStartDate: { $lte: endDate },
      $or: [
        { 'availabilityImpact.to': { $gte: startDate } },
        { 'availabilityImpact.to': null }
      ]
    };
    
    logger.info(`🔍 Query for contracts:`, JSON.stringify(query, null, 2));
    
    const contracts = await Vertrag.find(query).populate('services.mietfach');

    logger.info(`Found ${contracts.length} projected contracts for future period`);
    if (contracts.length > 0) {
      logger.info('🔍🔍🔍 CONTRACT DETAILS FOR DEBUG:', JSON.stringify(contracts.map(c => ({
        id: c._id,
        status: c.status,
        scheduledStartDate: c.scheduledStartDate?.toISOString(),
        availabilityImpactFrom: c.availabilityImpact?.from?.toISOString(),
        availabilityImpactTo: c.availabilityImpact?.to?.toISOString(),
        totalMonthlyPrice: c.totalMonthlyPrice,
        discount: c.discount,
        services: c.services?.length || 0,
        istProbemonatBuchung: c.istProbemonatBuchung,
        zahlungspflichtigAb: c.zahlungspflichtigAb?.toISOString()
      })), null, 2));
    } else {
      logger.info('🔍🔍🔍 NO CONTRACTS FOUND - searching for all contracts in DB...');
      const allContracts = await Vertrag.find({});
      logger.info(`Total contracts in DB: ${allContracts.length}`);
      if (allContracts.length > 0) {
        logger.info('Sample contract data:', JSON.stringify(allContracts[0], null, 2));
      }
    }

    // For future projections, assume trial periods will convert to paid
    const paidContracts = contracts.filter(contract => {
      if (!contract.istProbemonatBuchung) {
        return true; // Regular contracts
      }
      // Trial contracts that will become paid by this month
      return contract.zahlungspflichtigAb && contract.zahlungspflichtigAb <= endDate;
    });

    const trialContracts = contracts.filter(contract => 
      contract.istProbemonatBuchung && 
      (!contract.zahlungspflichtigAb || contract.zahlungspflichtigAb > endDate)
    );

    logger.info(`Projected paid contracts: ${paidContracts.length}, Remaining trial contracts: ${trialContracts.length}`);
    logger.info('Paid contracts details:', paidContracts.map(c => ({
      id: c._id,
      istProbemonatBuchung: c.istProbemonatBuchung,
      zahlungspflichtigAb: c.zahlungspflichtigAb,
      totalMonthlyPrice: c.totalMonthlyPrice
    })));
    logger.info('Trial contracts details:', trialContracts.map(c => ({
      id: c._id,
      istProbemonatBuchung: c.istProbemonatBuchung,
      zahlungspflichtigAb: c.zahlungspflichtigAb
    })));

    // Calculate projected revenue
    logger.info(`🔍 STARTING REVENUE CALCULATION for ${year}-${month} with ${paidContracts.length} paid contracts (includeTrialRevenue: ${includeTrialRevenue})`);
    
    let contractsToCalculate = paidContracts;
    if (includeTrialRevenue) {
      contractsToCalculate = [...paidContracts, ...trialContracts];
    }
    
    const gesamteinnahmen = contractsToCalculate.reduce((sum, contract) => {
      const contractRevenue = this.calculateContractRevenue(contract, startDate, endDate);
      logger.info(`🔍 Contract ${contract._id} revenue for ${year}-${month}:`, {
        contractRevenue,
        totalMonthlyPrice: contract.totalMonthlyPrice,
        discount: contract.discount,
        servicesCount: contract.services?.length || 0
      });
      return sum + contractRevenue;
    }, 0);
    logger.info(`🔍 TOTAL REVENUE for ${year}-${month}: ${gesamteinnahmen}€`);

    // Aggregate revenue by Mietfach
    const mietfachRevenue = await this.aggregateByMietfach(paidContracts, trialContracts, startDate, endDate);

    return {
      monat: startDate,
      gesamteinnahmen: Math.round(gesamteinnahmen * 100) / 100,
      anzahlAktiveVertraege: paidContracts.length,
      anzahlProbemonatVertraege: trialContracts.length,
      einnahmenProMietfach: mietfachRevenue,
      isProjection: true // Flag to indicate this is a projection
    } as IMonthlyRevenue;
  }

  /**
   * Calculates monthly revenue for a specific month (historical)
   * @description Calculates and stores historical revenue data for a specific month
   * @param year - Target year for calculation
   * @param month - Target month for calculation (1-12)
   * @param includeTrialRevenue - Whether to include trial revenue in calculations
   * @returns Promise<IMonthlyRevenue> - Calculated monthly revenue with database update
   * @complexity O(n) where n is number of contracts in period
   * @security Database write operation with comprehensive validation
   */
  async calculateMonthlyRevenue(year: number, month: number, includeTrialRevenue: boolean = false): Promise<IMonthlyRevenue> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999); // End of day

    logger.info(`Calculating revenue for ${year}-${month}: ${startDate} to ${endDate} (includeTrialRevenue: ${includeTrialRevenue})`);

    // Get all contracts that were active during this month
    const contracts = await Vertrag.find({
      status: { $in: ['active', 'scheduled'] },
      scheduledStartDate: { $lte: endDate },
      $or: [
        { 'availabilityImpact.to': { $gte: startDate } },
        { 'availabilityImpact.to': null }
      ]
    }).populate('services.mietfach');

    logger.info(`Found ${contracts.length} contracts for the period`);

    // Separate contracts into paid and trial categories
    const paidContracts = contracts.filter(contract => 
      !contract.istProbemonatBuchung || 
      (contract.zahlungspflichtigAb && contract.zahlungspflichtigAb <= endDate)
    );

    const trialContracts = contracts.filter(contract => 
      contract.istProbemonatBuchung && 
      (!contract.zahlungspflichtigAb || contract.zahlungspflichtigAb > endDate)
    );

    logger.info(`Paid contracts: ${paidContracts.length}, Trial contracts: ${trialContracts.length}`);

    // Calculate total revenue from paid contracts and optionally trial contracts
    let contractsToCalculate = paidContracts;
    if (includeTrialRevenue) {
      contractsToCalculate = [...paidContracts, ...trialContracts];
    }
    
    const gesamteinnahmen = contractsToCalculate.reduce((sum, contract) => {
      return sum + this.calculateContractRevenue(contract, startDate, endDate);
    }, 0);

    // Aggregate revenue by Mietfach
    const mietfachRevenue = await this.aggregateByMietfach(paidContracts, trialContracts, startDate, endDate);

    // Create or update monthly revenue record
    const monthlyRevenueData = {
      monat: startDate,
      gesamteinnahmen,
      anzahlAktiveVertraege: paidContracts.length,
      anzahlProbemonatVertraege: trialContracts.length,
      einnahmenProMietfach: mietfachRevenue,
      aktualisiertAm: new Date()
    };

    const updatedRevenue = await MonthlyRevenue.findOneAndUpdate(
      { monat: startDate },
      monthlyRevenueData,
      { upsert: true, new: true }
    );

    logger.info(`Monthly revenue calculated: €${gesamteinnahmen}`);
    return updatedRevenue;
  }

  /**
   * Calculates revenue for a single contract within a date range
   * @description Calculates prorated revenue based on contract duration and trial periods
   * @param contract - Contract object to calculate revenue for
   * @param startDate - Start date of the calculation period
   * @param endDate - End date of the calculation period
   * @returns number - Prorated revenue amount for the contract
   * @complexity O(1) - Simple calculation with date arithmetic
   * @security Private method with extensive logging for debugging
   */
  private calculateContractRevenue(contract: IVertrag, startDate: Date, endDate: Date): number {
    logger.info(`🔍 calculateContractRevenue for ${contract._id}:`, {
      totalMonthlyPrice: contract.totalMonthlyPrice,
      discount: contract.discount,
      scheduledStartDate: contract.scheduledStartDate?.toISOString(),
      availabilityImpactTo: contract.availabilityImpact?.to?.toISOString(),
      istProbemonatBuchung: contract.istProbemonatBuchung,
      zahlungspflichtigAb: contract.zahlungspflichtigAb?.toISOString(),
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString()
    });
    // If contract hasn't started yet or ended before/on period start, no revenue
    if (contract.scheduledStartDate > endDate || 
        (contract.availabilityImpact?.to && contract.availabilityImpact.to <= startDate)) {
      return 0;
    }

    // For trial contracts, revenue only starts from zahlungspflichtigAb date
    let revenueStartDate: Date;
    
    if (contract.istProbemonatBuchung && contract.zahlungspflichtigAb) {
      // Trial contract: revenue starts from zahlungspflichtigAb date
      revenueStartDate = contract.zahlungspflichtigAb > startDate ? contract.zahlungspflichtigAb : startDate;
      
      // If zahlungspflichtigAb is after the period end, no revenue in this period
      if (contract.zahlungspflichtigAb > endDate) {
        logger.info(`Trial contract ${contract._id} not yet revenue-generating in this period`);
        return 0;
      }
    } else {
      // Regular contract: revenue starts from scheduled start date
      revenueStartDate = contract.scheduledStartDate > startDate ? contract.scheduledStartDate : startDate;
    }
    
    const contractStart = revenueStartDate;
    
    // Contract end date - use the last day the contract is active within the period
    let contractEnd = endDate;
    if (contract.availabilityImpact?.to) {
      // Contract has an end date
      const contractEndDate = new Date(contract.availabilityImpact.to);
      // The contract is active until the day before the end date
      const lastActiveDay = new Date(contractEndDate.getTime() - 24 * 60 * 60 * 1000);
      
      // If the last active day is before or equal to the period end, use it
      if (lastActiveDay <= endDate) {
        contractEnd = lastActiveDay;
      }
    }

    // Make sure contractEnd is not before contractStart
    if (contractEnd < contractStart) {
      logger.info(`Contract ${contract._id} ends before it starts in this period - no revenue`);
      return 0;
    }

    const daysActive = Math.ceil((contractEnd.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysInMonth = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate prorated monthly revenue
    const monthlyPrice = contract.totalMonthlyPrice || 0;
    const proratedRevenue = (monthlyPrice * daysActive) / daysInMonth;

    logger.info(`🔍 Contract ${contract._id} revenue calculation:`, {
      contractStart: contractStart.toISOString(),
      contractEnd: contractEnd.toISOString(),
      daysActive,
      daysInMonth,
      monthlyPrice,
      proratedRevenue,
      isTrialContract: contract.istProbemonatBuchung,
      zahlungspflichtigAb: contract.zahlungspflichtigAb?.toISOString()
    });

    return proratedRevenue;
  }

  /**
   * Aggregates revenue data by Mietfach
   * @description Groups revenue data by individual Mietfach units for detailed analysis
   * @param paidContracts - Array of paid contracts to aggregate
   * @param trialContracts - Array of trial contracts to aggregate
   * @param startDate - Start date of the aggregation period
   * @param endDate - End date of the aggregation period
   * @returns Promise<IMietfachRevenue[]> - Revenue data grouped by Mietfach
   * @complexity O(n*m) where n is contracts and m is services per contract
   * @security Private method with database optimization using single queries
   */
  private async aggregateByMietfach(
      paidContracts: IVertrag[], 
      trialContracts: IVertrag[],
      startDate: Date,
      endDate: Date
    ): Promise<IMietfachRevenue[]> {
      // Extract all unique Mietfach IDs first
      const allMietfachIds = new Set<string>();
      [...paidContracts, ...trialContracts].forEach(contract => {
        contract.services.forEach(service => {
          if (service.mietfach) {
            const mietfachId = typeof service.mietfach === 'object' && (service.mietfach as any)._id 
              ? (service.mietfach as any)._id.toString() 
              : service.mietfach.toString();
            allMietfachIds.add(mietfachId);
          }
        });
      });
  
      // Fetch all Mietfächer in a single query
      const mietfaecherMap = new Map<string, any>();
      if (allMietfachIds.size > 0) {
        const mietfaecher = await Mietfach.find({
          _id: { $in: Array.from(allMietfachIds) }
        });
        
        mietfaecher.forEach(mf => {
          mietfaecherMap.set((mf._id as any).toString(), mf);
        });
      }
  
      const mietfachMap = new Map<string, IMietfachRevenue>();
  
      // Process paid contracts
      for (const contract of paidContracts) {
        for (const service of contract.services) {
          if (!service.mietfach) continue;
  
          const mietfachId = typeof service.mietfach === 'object' && (service.mietfach as any)._id 
            ? (service.mietfach as any)._id.toString() 
            : service.mietfach.toString();
          
          const mietfach = mietfaecherMap.get(mietfachId);
          if (!mietfach) continue;
  
          const serviceRevenue = this.calculateServiceRevenue(service, startDate, endDate);
  
          if (mietfachMap.has(mietfachId)) {
            const existing = mietfachMap.get(mietfachId)!;
            existing.einnahmen += serviceRevenue;
            existing.anzahlVertraege += 1;
          } else {
            mietfachMap.set(mietfachId, {
              mietfachId: mietfachId as any,
              mietfachNummer: mietfach.bezeichnung || `Mietfach-${mietfachId.slice(-6)}`,
              einnahmen: serviceRevenue,
              anzahlVertraege: 1,
              anzahlProbemonatVertraege: 0
            });
          }
        }
      }
  
      // Process trial contracts (no revenue, but count them)
      for (const contract of trialContracts) {
        for (const service of contract.services) {
          if (!service.mietfach) continue;
  
          const mietfachId = typeof service.mietfach === 'object' && (service.mietfach as any)._id 
            ? (service.mietfach as any)._id.toString() 
            : service.mietfach.toString();
          
          const mietfach = mietfaecherMap.get(mietfachId);
          if (!mietfach) continue;
  
          if (mietfachMap.has(mietfachId)) {
            const existing = mietfachMap.get(mietfachId)!;
            existing.anzahlProbemonatVertraege += 1;
          } else {
            mietfachMap.set(mietfachId, {
              mietfachId: new mongoose.Types.ObjectId(mietfachId),
              mietfachNummer: mietfach.bezeichnung || `Mietfach-${mietfachId.slice(-6)}`,
              einnahmen: 0,
              anzahlVertraege: 0,
              anzahlProbemonatVertraege: 1
            });
          }
        }
      }
  
      return Array.from(mietfachMap.values());
    }


  /**
   * Calculates revenue for a single service within a date range
   * @description Calculates prorated revenue for individual service within a contract
   * @param service - Service object to calculate revenue for
   * @param startDate - Start date of the calculation period
   * @param endDate - End date of the calculation period
   * @returns number - Prorated revenue amount for the service
   * @complexity O(1) - Simple calculation with date arithmetic
   * @security Private method with bounds checking
   */
  private calculateServiceRevenue(service: any, startDate: Date, endDate: Date): number {
    const serviceStart = service.mietbeginn > startDate ? service.mietbeginn : startDate;
    const serviceEnd = service.mietende && service.mietende < endDate ? service.mietende : endDate;

    if (serviceStart > serviceEnd) return 0;

    const daysActive = Math.max(0, Math.ceil((serviceEnd.getTime() - serviceStart.getTime()) / (1000 * 60 * 60 * 24))) + 1;
    const daysInMonth = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const monthlyPrice = service.monatspreis || 0;
    return (monthlyPrice * daysActive) / daysInMonth;
  }

  /**
   * Retrieves monthly revenue data for a specific month
   * @description Fetches stored monthly revenue data from database
   * @param year - Target year
   * @param month - Target month (1-12)
   * @returns Promise<IMonthlyRevenue | null> - Monthly revenue data or null if not found
   * @complexity O(1) - Single database query
   * @security Read-only operation with date validation
   */
  async getMonthlyRevenue(year: number, month: number): Promise<IMonthlyRevenue | null> {
    const startDate = new Date(year, month - 1, 1);
    return await MonthlyRevenue.findOne({ monat: startDate });
  }

  /**
   * Retrieves revenue data for a date range
   * @description Fetches multiple months of revenue data sorted chronologically
   * @param startYear - Start year of the range
   * @param startMonth - Start month of the range (1-12)
   * @param endYear - End year of the range
   * @param endMonth - End month of the range (1-12)
   * @returns Promise<IMonthlyRevenue[]> - Array of monthly revenue data
   * @complexity O(n) where n is number of months in range
   * @security Read-only operation with range validation
   */
  async getRevenueRange(startYear: number, startMonth: number, endYear: number, endMonth: number): Promise<IMonthlyRevenue[]> {
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth, 0);

    return await MonthlyRevenue.find({
      monat: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ monat: 1 });
  }

  /**
   * Calculates and updates revenue for multiple months
   * @description Processes revenue calculations for a range of months sequentially
   * @param startYear - Start year of the range
   * @param startMonth - Start month of the range (1-12)
   * @param endYear - End year of the range
   * @param endMonth - End month of the range (1-12)
   * @returns Promise<IMonthlyRevenue[]> - Array of calculated monthly revenue data
   * @complexity O(n*m) where n is months and m is contracts per month
   * @security Database write operations with comprehensive validation
   */
  async calculateRevenueRange(startYear: number, startMonth: number, endYear: number, endMonth: number): Promise<IMonthlyRevenue[]> {
    const results: IMonthlyRevenue[] = [];
    
    let currentYear = startYear;
    let currentMonth = startMonth;

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthlyRevenue = await this.calculateMonthlyRevenue(currentYear, currentMonth);
      results.push(monthlyRevenue);

      // Move to next month
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    return results;
  }

  /**
   * Retrieves comprehensive revenue statistics
   * @description Calculates aggregated statistics across all tracked revenue periods
   * @returns Promise<Object> - Statistics including totals, averages, and counts
   * @complexity O(n) where n is number of tracked months
   * @security Read-only operation with comprehensive aggregation
   */
  async getRevenueStatistics(): Promise<{
    totalRevenue: number;
    totalActiveContracts: number;
    totalTrialContracts: number;
    averageMonthlyRevenue: number;
    monthsTracked: number;
  }> {
    const allRevenue = await MonthlyRevenue.find().sort({ monat: 1 });

    const totalRevenue = allRevenue.reduce((sum, month) => sum + month.gesamteinnahmen, 0);
    const totalActiveContracts = allRevenue.reduce((sum, month) => sum + month.anzahlAktiveVertraege, 0);
    const totalTrialContracts = allRevenue.reduce((sum, month) => sum + month.anzahlProbemonatVertraege, 0);
    
    return {
      totalRevenue,
      totalActiveContracts,
      totalTrialContracts,
      averageMonthlyRevenue: allRevenue.length > 0 ? totalRevenue / allRevenue.length : 0,
      monthsTracked: allRevenue.length
    };
  }

  /**
   * Retrieves revenue trend analysis
   * @description Analyzes revenue trends including growth rates and performance metrics
   * @param months - Number of months to analyze (default: 12)
   * @returns Promise<Object> - Trend analysis with growth rates and best/worst months
   * @complexity O(n) where n is number of months analyzed
   * @security Read-only operation with statistical calculations
   */
  async getRevenueTrends(months: number = 12): Promise<{
    monthlyTrends: Array<{
      month: Date;
      revenue: number;
      growthRate: number;
      contracts: number;
      trialContracts: number;
    }>;
    averageGrowthRate: number;
    bestMonth: { month: Date; revenue: number };
    worstMonth: { month: Date; revenue: number };
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const revenueData = await MonthlyRevenue.find({
      monat: { $gte: startDate, $lte: endDate }
    }).sort({ monat: 1 });

    const monthlyTrends = revenueData.map((current, index) => {
      const previous = index > 0 ? revenueData[index - 1] : null;
      const growthRate = previous 
        ? ((current.gesamteinnahmen - previous.gesamteinnahmen) / previous.gesamteinnahmen) * 100
        : 0;

      return {
        month: current.monat,
        revenue: current.gesamteinnahmen,
        growthRate,
        contracts: current.anzahlAktiveVertraege,
        trialContracts: current.anzahlProbemonatVertraege
      };
    });

    const revenueValues = monthlyTrends.map(t => t.revenue);
    const growthRates = monthlyTrends.slice(1).map(t => t.growthRate);
    
    let bestMonth = { month: new Date(), revenue: 0 };
    let worstMonth = { month: new Date(), revenue: 0 };
    
    if (monthlyTrends.length > 0) {
      const bestMonthIndex = revenueValues.indexOf(Math.max(...revenueValues));
      const worstMonthIndex = revenueValues.indexOf(Math.min(...revenueValues));
      
      bestMonth = {
        month: monthlyTrends[bestMonthIndex].month,
        revenue: monthlyTrends[bestMonthIndex].revenue
      };
      
      worstMonth = {
        month: monthlyTrends[worstMonthIndex].month,
        revenue: monthlyTrends[worstMonthIndex].revenue
      };
    }

    return {
      monthlyTrends,
      averageGrowthRate: growthRates.length > 0 
        ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length 
        : 0,
      bestMonth,
      worstMonth
    };
  }

  /**
   * Retrieves Mietfach occupancy and revenue analysis
   * @description Analyzes occupancy rates and performance for individual Mietfach units
   * @param year - Target year for analysis
   * @param month - Target month for analysis (1-12)
   * @returns Promise<Object> - Occupancy analysis with top performers and vacant units
   * @complexity O(n) where n is number of Mietfach units
   * @security Read-only operation with comprehensive unit analysis
   */
  async getMietfachAnalysis(year: number, month: number): Promise<{
    totalMietfaecher: number;
    occupiedMietfaecher: number;
    occupancyRate: number;
    topPerformingMietfaecher: Array<{
      mietfachId: mongoose.Types.ObjectId;
      mietfachNummer: string;
      revenue: number;
      contracts: number;
    }>;
    underperformingMietfaecher: Array<{
      mietfachId: mongoose.Types.ObjectId;
      mietfachNummer: string;
      daysVacant: number;
    }>;
  }> {
    const totalMietfaecher = await Mietfach.countDocuments({ verfuegbar: true });
    
    const monthlyRevenue = await this.getMonthlyRevenue(year, month);
    const occupiedMietfaecher = monthlyRevenue?.einnahmenProMietfach.length || 0;
    
    // Get top performing Mietfächer
    const topPerformingMietfaecher = monthlyRevenue?.einnahmenProMietfach
      .sort((a, b) => b.einnahmen - a.einnahmen)
      .slice(0, 10)
      .map(mf => ({
        mietfachId: mf.mietfachId,
        mietfachNummer: mf.mietfachNummer,
        revenue: mf.einnahmen,
        contracts: mf.anzahlVertraege
      })) || [];

    // Find vacant Mietfächer
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const allMietfaecher = await Mietfach.find({ verfuegbar: true });
    const occupiedIds = monthlyRevenue?.einnahmenProMietfach.map(mf => mf.mietfachId.toString()) || [];
    
    const vacantMietfaecher = allMietfaecher
      .filter(mf => !occupiedIds.includes(mf.id.toString()))
      .map(mf => ({
        mietfachId: new mongoose.Types.ObjectId(mf.id.toString()),
        mietfachNummer: mf.bezeichnung || `Mietfach-${mf.id.toString().slice(-6)}`,
        daysVacant: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      }));

    return {
      totalMietfaecher,
      occupiedMietfaecher,
      occupancyRate: totalMietfaecher > 0 ? (occupiedMietfaecher / totalMietfaecher) * 100 : 0,
      topPerformingMietfaecher,
      underperformingMietfaecher: vacantMietfaecher.slice(0, 10)
    };
  }

  /**
   * Exports revenue data to CSV format
   * @description Generates CSV report of revenue data for specified date range
   * @param startYear - Start year of the export range
   * @param startMonth - Start month of the export range (1-12)
   * @param endYear - End year of the export range
   * @param endMonth - End month of the export range (1-12)
   * @returns Promise<string> - CSV formatted revenue data
   * @complexity O(n) where n is number of months in range
   * @security Read-only operation with CSV formatting
   */
  async exportRevenueToCSV(startYear: number, startMonth: number, endYear: number, endMonth: number): Promise<string> {
    const revenueData = await this.getRevenueRange(startYear, startMonth, endYear, endMonth);
    
    // CSV Headers
    let csv = 'Monat,Gesamteinnahmen (€),Aktive Verträge,Probemonat Verträge,Belegte Mietfächer\n';
    
    // Add revenue data
    for (const month of revenueData) {
      const monthStr = month.monat.toLocaleDateString('de-DE', { year: 'numeric', month: 'long' });
      const revenue = month.gesamteinnahmen.toFixed(2);
      const activeContracts = month.anzahlAktiveVertraege;
      const trialContracts = month.anzahlProbemonatVertraege;
      const occupiedMietfaecher = month.einnahmenProMietfach.length;
      
      csv += `"${monthStr}",${revenue},${activeContracts},${trialContracts},${occupiedMietfaecher}\n`;
    }
    
    // Add summary
    const totalRevenue = revenueData.reduce((sum, m) => sum + m.gesamteinnahmen, 0);
    const avgRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
    
    csv += '\nZusammenfassung\n';
    csv += `"Gesamteinnahmen",${totalRevenue.toFixed(2)}\n`;
    csv += `"Durchschnittliche Monatseinnahmen",${avgRevenue.toFixed(2)}\n`;
    csv += `"Anzahl Monate",${revenueData.length}\n`;
    
    return csv;
  }

  /**
   * Exports detailed Mietfach revenue data to CSV
   * @description Generates CSV report of individual Mietfach performance for a specific month
   * @param year - Target year for export
   * @param month - Target month for export (1-12)
   * @returns Promise<string> - CSV formatted Mietfach revenue data
   * @complexity O(n) where n is number of Mietfach units
   * @security Read-only operation with detailed unit reporting
   */
  async exportMietfachRevenueToCSV(year: number, month: number): Promise<string> {
    const monthlyRevenue = await this.getMonthlyRevenue(year, month);
    
    if (!monthlyRevenue) {
      return 'Keine Daten für den angegebenen Monat vorhanden.';
    }
    
    // CSV Headers
    let csv = 'Mietfach Nummer,Einnahmen (€),Anzahl Verträge,Anzahl Probemonat Verträge\n';
    
    // Sort by revenue descending
    const sortedMietfaecher = [...monthlyRevenue.einnahmenProMietfach]
      .sort((a, b) => b.einnahmen - a.einnahmen);
    
    // Add Mietfach data
    for (const mf of sortedMietfaecher) {
      csv += `"${mf.mietfachNummer}",${mf.einnahmen.toFixed(2)},${mf.anzahlVertraege},${mf.anzahlProbemonatVertraege}\n`;
    }
    
    // Add summary
    const totalRevenue = monthlyRevenue.gesamteinnahmen;
    const totalContracts = monthlyRevenue.anzahlAktiveVertraege;
    const totalTrialContracts = monthlyRevenue.anzahlProbemonatVertraege;
    
    csv += '\nZusammenfassung\n';
    csv += `"Gesamteinnahmen",${totalRevenue.toFixed(2)}\n`;
    csv += `"Aktive Verträge",${totalContracts}\n`;
    csv += `"Probemonat Verträge",${totalTrialContracts}\n`;
    csv += `"Belegte Mietfächer",${sortedMietfaecher.length}\n`;
    
    return csv;
  }

  /**
   * Retrieves year-over-year comparison
   * @description Compares current year revenue performance with previous year
   * @param year - Target year for comparison
   * @returns Promise<Object> - Year-over-year comparison with growth metrics
   * @complexity O(n) where n is number of months in each year
   * @security Read-only operation with growth rate calculations
   */
  async getYearOverYearComparison(year: number): Promise<{
    currentYear: {
      year: number;
      totalRevenue: number;
      avgMonthlyRevenue: number;
      totalContracts: number;
    };
    previousYear: {
      year: number;
      totalRevenue: number;
      avgMonthlyRevenue: number;
      totalContracts: number;
    };
    growth: {
      revenueGrowth: number;
      contractGrowth: number;
    };
  }> {
    const currentYearData = await this.getRevenueRange(year, 1, year, 12);
    const previousYearData = await this.getRevenueRange(year - 1, 1, year - 1, 12);
    
    const currentYearRevenue = currentYearData.reduce((sum, m) => sum + m.gesamteinnahmen, 0);
    const currentYearContracts = currentYearData.reduce((sum, m) => sum + m.anzahlAktiveVertraege, 0);
    
    const previousYearRevenue = previousYearData.reduce((sum, m) => sum + m.gesamteinnahmen, 0);
    const previousYearContracts = previousYearData.reduce((sum, m) => sum + m.anzahlAktiveVertraege, 0);
    
    return {
      currentYear: {
        year,
        totalRevenue: currentYearRevenue,
        avgMonthlyRevenue: currentYearData.length > 0 ? currentYearRevenue / currentYearData.length : 0,
        totalContracts: currentYearContracts
      },
      previousYear: {
        year: year - 1,
        totalRevenue: previousYearRevenue,
        avgMonthlyRevenue: previousYearData.length > 0 ? previousYearRevenue / previousYearData.length : 0,
        totalContracts: previousYearContracts
      },
      growth: {
        revenueGrowth: previousYearRevenue > 0 
          ? ((currentYearRevenue - previousYearRevenue) / previousYearRevenue) * 100 
          : 0,
        contractGrowth: previousYearContracts > 0 
          ? ((currentYearContracts - previousYearContracts) / previousYearContracts) * 100 
          : 0
      }
    };
  }

  /**
   * Refreshes revenue data for all months (for maintenance/corrections)
   * @description Recalculates all revenue data from earliest contract to present
   * @returns Promise<void> - Completes when all data is refreshed
   * @complexity O(n*m) where n is months and m is contracts per month
   * @security Database write operation with comprehensive recalculation
   */
  async refreshAllRevenueData(): Promise<void> {
    logger.info('Starting full revenue data refresh...');
    
    // Find the earliest contract
    const earliestContract = await Vertrag.findOne().sort({ createdAt: 1 });
    if (!earliestContract) {
      logger.info('No contracts found');
      return;
    }
    
    const startDate = new Date(earliestContract.createdAt);
    const endDate = new Date();
    
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (currentDate <= endDate) {
      logger.info(`Calculating revenue for ${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`);
      await this.calculateMonthlyRevenue(currentDate.getFullYear(), currentDate.getMonth() + 1);
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    logger.info('Revenue data refresh completed');
  }

  /**
   * Retrieves revenue projections for a range of future months
   * @description Generates projections for multiple future months based on scheduled contracts
   * @param startYear - Start year of the projection range
   * @param startMonth - Start month of the projection range (1-12)
   * @param endYear - End year of the projection range
   * @param endMonth - End month of the projection range (1-12)
   * @returns Promise<IMonthlyRevenue[]> - Array of future revenue projections
   * @complexity O(n*m) where n is months and m is contracts per month
   * @security Read-only operation with projection calculations
   */
  async getFutureRevenueRange(startYear: number, startMonth: number, endYear: number, endMonth: number): Promise<IMonthlyRevenue[]> {
    const result: IMonthlyRevenue[] = [];
    const currentDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth - 1, 1);

    while (currentDate <= endDate) {
      const projection = await this.calculateFutureRevenue(
        currentDate.getFullYear(), 
        currentDate.getMonth() + 1
      );
      result.push(projection);
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return result.sort((a, b) => a.monat.getTime() - b.monat.getTime());
  }

  /**
   * Retrieves combined historical and future revenue data
   * @description Combines historical revenue data with future projections for comprehensive view
   * @param startYear - Start year of the combined range
   * @param startMonth - Start month of the combined range (1-12)
   * @param endYear - End year of the combined range
   * @param endMonth - End month of the combined range (1-12)
   * @param includeTrialRevenue - Whether to include trial revenue in calculations
   * @returns Promise<IMonthlyRevenue[]> - Combined historical and projected revenue data
   * @complexity O(n*m) where n is months and m is contracts per month
   * @security Mixed read/write operation with comprehensive data handling
   */
  async getCombinedRevenueRange(startYear: number, startMonth: number, endYear: number, endMonth: number, includeTrialRevenue: boolean = false): Promise<IMonthlyRevenue[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const result: IMonthlyRevenue[] = [];
    const currentDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth - 1, 1);

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      // Determine if this is historical or future
      const isPast = year < currentYear || (year === currentYear && month < currentMonth);
      const isCurrent = year === currentYear && month === currentMonth;
      
      if (isPast || isCurrent) {
        // Get historical data (calculated or calculate if missing)
        try {
          let monthlyRevenue = await this.getMonthlyRevenue(year, month);
          if (!monthlyRevenue) {
            // Calculate historical revenue if not yet calculated
            monthlyRevenue = await this.calculateMonthlyRevenue(year, month, includeTrialRevenue);
          } else if (includeTrialRevenue) {
            // Recalculate with trial revenue included
            monthlyRevenue = await this.calculateMonthlyRevenue(year, month, includeTrialRevenue);
          }
          result.push(monthlyRevenue);
        } catch (error) {
          console.warn(`Failed to get historical revenue for ${year}-${month}:`, error);
        }
      } else {
        // Get future projection
        try {
          const projection = await this.calculateFutureRevenue(year, month, includeTrialRevenue);
          result.push(projection);
        } catch (error) {
          console.warn(`Failed to calculate future revenue for ${year}-${month}:`, error);
        }
      }
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return result.sort((a, b) => a.monat.getTime() - b.monat.getTime());
  }

  /**
   * Retrieves contract pipeline for future periods
   * @description Analyzes upcoming contracts and their projected revenue impact
   * @param months - Number of months to analyze (default: 12)
   * @returns Promise<any[]> - Array of future contracts with revenue projections
   * @complexity O(n) where n is number of future contracts
   * @security Read-only operation with contract analysis
   */
  async getContractPipeline(months: number = 12): Promise<any[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const futureContracts = await Vertrag.find({
      status: { $in: ['scheduled', 'active'] },
      scheduledStartDate: { $gte: startDate, $lte: endDate }
    }).populate('services.mietfach user').sort({ scheduledStartDate: 1 });

    return futureContracts.map(contract => ({
      id: contract._id,
      startDate: contract.scheduledStartDate,
      endDate: contract.availabilityImpact?.to,
      monthlyRevenue: contract.totalMonthlyPrice,
      isTrialBooking: contract.istProbemonatBuchung,
      trialEndDate: contract.zahlungspflichtigAb,
      vendor: contract.user,
      services: contract.services
    }));
  }

  /**
   * Retrieves projected occupancy rates for future months
   * @description Calculates expected occupancy rates based on scheduled contracts
   * @param months - Number of months to project (default: 12)
   * @returns Promise<any[]> - Array of projected occupancy data
   * @complexity O(n*m) where n is months and m is contracts per month
   * @security Read-only operation with occupancy projections
   */
  async getProjectedOccupancy(months: number = 12): Promise<any[]> {
    const result = [];
    const currentDate = new Date();
    
    for (let i = 0; i < months; i++) {
      const targetDate = new Date(currentDate);
      targetDate.setMonth(targetDate.getMonth() + i);
      
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      // Count total available Mietfächer
      const totalMietfaecher = await Mietfach.countDocuments({ verfuegbar: true });

      // Count projected occupied Mietfächer
      const occupiedContracts = await Vertrag.find({
        status: { $in: ['active', 'scheduled'] },
        scheduledStartDate: { $lte: monthEnd },
        $or: [
          { 'availabilityImpact.to': { $gte: monthStart } },
          { 'availabilityImpact.to': null }
        ]
      });

      const occupiedMietfaecher = new Set();
      occupiedContracts.forEach(contract => {
        contract.services.forEach((service: any) => {
          if (service.mietfach) {
            occupiedMietfaecher.add(service.mietfach.toString());
          }
        });
      });

      const occupancyRate = totalMietfaecher > 0 ? (occupiedMietfaecher.size / totalMietfaecher) * 100 : 0;

      result.push({
        month: monthStart,
        totalMietfaecher,
        occupiedMietfaecher: occupiedMietfaecher.size,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        isProjection: true
      });
    }

    return result;
  }
}

export const revenueService = new RevenueService();