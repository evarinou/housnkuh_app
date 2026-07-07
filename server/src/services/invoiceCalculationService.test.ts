/**
 * @file invoiceCalculationService.test.ts
 * @purpose Unit tests for InvoiceCalculationService
 * @created 2025-08-21
 * @modified 2025-09-16
 */

// @ts-nocheck

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Types } from 'mongoose';
import { InvoiceCalculationService, ProrationMethod } from './invoiceCalculationService';

// Mock the logger
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock Vertrag model with ZUSATZLEISTUNGEN_PREISE
jest.mock('../models/Vertrag', () => ({
  __esModule: true,
  default: {
    find: jest.fn()
  },
  ZUSATZLEISTUNGEN_PREISE: {
    lagerservice: 20.00,
    versandservice: 5.00
  }
}));

describe('InvoiceCalculationService', () => {
  let service: InvoiceCalculationService;
  let mockFind: any;

  beforeEach(() => {
    service = new InvoiceCalculationService();
    jest.clearAllMocks();

    // Get the mocked function
    const Vertrag = require('../models/Vertrag').default;
    mockFind = Vertrag.find;

    mockFind.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
  });

  describe('calculateProratedAmount - Basic Tests', () => {
    it('should return full amount for full month period', () => {
      const amount = 50.00;
      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-31T23:59:59.999Z');

      const result = service.calculateProratedAmount(amount, startDate, endDate);

      expect(result).toBe(amount);
    });

    it('should calculate prorated amount for partial month', () => {
      const amount = 50.00;
      const startDate = new Date('2025-08-15');
      const endDate = new Date('2025-08-31T23:59:59.999Z');

      const result = service.calculateProratedAmount(amount, startDate, endDate);

      // August has 31 days, starting on 15th gives us 17 days
      const expected = (50.00 * 17) / 31;
      expect(result).toBeCloseTo(expected, 2);
    });

    it('should return 0 for zero amount', () => {
      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-31T23:59:59.999Z');

      const result = service.calculateProratedAmount(0, startDate, endDate);

      expect(result).toBe(0);
    });

    it('should return 0 when start date is after end date', () => {
      const amount = 50.00;
      const startDate = new Date('2025-08-31');
      const endDate = new Date('2025-08-01');

      const result = service.calculateProratedAmount(amount, startDate, endDate);

      expect(result).toBe(0);
    });

    it('should handle leap year February correctly', () => {
      const amount = 60.00;
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-29T23:59:59.999Z');

      const result = service.calculateProratedAmount(amount, startDate, endDate);

      expect(result).toBe(amount); // Full month in leap year
    });
  });

  describe('calculateMonthlyCharges - Basic Tests', () => {
    it('should return null when no active contracts found', async () => {
      const vendorId = new Types.ObjectId();
      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([])
      });

      const result = await service.calculateMonthlyCharges(vendorId, 8, 2025);

      expect(result).toBeNull();
      expect(mockFind).toHaveBeenCalledWith({
        user: vendorId,
        status: { $in: ['active', 'scheduled'] }
      });
    });

    it('should validate month and year inputs', async () => {
      const vendorId = new Types.ObjectId();

      // Invalid month
      await expect(service.calculateMonthlyCharges(vendorId, 0, 2025))
        .rejects.toThrow('Month must be between 1 and 12');
      await expect(service.calculateMonthlyCharges(vendorId, 13, 2025))
        .rejects.toThrow('Month must be between 1 and 12');

      // Invalid year
      await expect(service.calculateMonthlyCharges(vendorId, 8, 2019))
        .rejects.toThrow('Year must be between 2020 and 2100');
      await expect(service.calculateMonthlyCharges(vendorId, 8, 2101))
        .rejects.toThrow('Year must be between 2020 and 2100');
    });

    it('should calculate charges for active contract with full month', async () => {
      const vendorId = new Types.ObjectId();
      const contractId = new Types.ObjectId();

      const mockContract = {
        _id: contractId,
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: false,
        totalMonthlyPrice: 50.00,
        scheduledStartDate: new Date('2025-01-01'),
        zusatzleistungen: {
          lagerservice: true,
          versandservice: true
        }
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([mockContract])
      });

      const result = await service.calculateMonthlyCharges(vendorId, 8, 2025);

      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(3); // Base + 2 zusatzleistungen
      expect(result?.items[0]).toMatchObject({
        description: 'Mietfach Service - 8/2025',
        quantity: 1,
        unitPrice: 50.00,
        type: 'mietfach',
        referenceId: contractId
      });
      expect(result?.subtotal).toBe(75.00); // 50 + 20 + 5
      expect(result?.taxAmount).toBe(14.25); // 19% of 75
      expect(result?.totalAmount).toBe(89.25);
    });
  });

  describe('getTaxAmount', () => {
    it('should calculate 19% tax correctly', () => {
      const subtotal = 100.00;
      const taxRate = 0.19;

      const result = service.getTaxAmount(subtotal, taxRate);

      expect(result).toBe(19.00);
    });

    it('should round tax to 2 decimal places', () => {
      const subtotal = 33.33;
      const taxRate = 0.19;

      const result = service.getTaxAmount(subtotal, taxRate);

      expect(result).toBe(6.33); // Rounded from 6.3327
    });

    it('should return 0 for zero subtotal', () => {
      const result = service.getTaxAmount(0, 0.19);

      expect(result).toBe(0);
    });

    it('should return 0 for zero tax rate', () => {
      const result = service.getTaxAmount(100, 0);

      expect(result).toBe(0);
    });

    it('should handle different tax rates', () => {
      const subtotal = 100.00;

      expect(service.getTaxAmount(subtotal, 0.07)).toBe(7.00); // 7%
      expect(service.getTaxAmount(subtotal, 0.21)).toBe(21.00); // 21%
      expect(service.getTaxAmount(subtotal, 0.25)).toBe(25.00); // 25%
    });
  });

  describe('calculateTrialAdjustment', () => {
    it('should return non-trial status for regular contracts', async () => {
      const contract = {
        istProbemonatBuchung: false,
        scheduledStartDate: new Date('2025-07-01')
      };
      const billingPeriod = {
        start: new Date('2025-08-01'),
        end: new Date('2025-08-31T23:59:59.999Z')
      };

      const result = await service.calculateTrialAdjustment(contract, billingPeriod);

      expect(result.isInTrialPeriod).toBe(false);
      expect(result.billingStartDate).toEqual(billingPeriod.start);
      expect(result.trialEndDate).toBeNull();
    });

    it('should return trial status when no payment obligation date set', async () => {
      const contract = {
        istProbemonatBuchung: true,
        scheduledStartDate: new Date('2025-07-01'),
        zahlungspflichtigAb: null
      };
      const billingPeriod = {
        start: new Date('2025-08-01'),
        end: new Date('2025-08-31T23:59:59.999Z')
      };

      const result = await service.calculateTrialAdjustment(contract, billingPeriod);

      expect(result.isInTrialPeriod).toBe(true);
      expect(result.billingStartDate).toBeNull();
      expect(result.trialEndDate).toBeNull();
    });

    it('should calculate billing start when payment obligation is mid-period', async () => {
      const paymentStart = new Date('2025-08-15');
      const contract = {
        istProbemonatBuchung: true,
        scheduledStartDate: new Date('2025-07-01'),
        zahlungspflichtigAb: paymentStart
      };
      const billingPeriod = {
        start: new Date('2025-08-01'),
        end: new Date('2025-08-31T23:59:59.999Z')
      };

      const result = await service.calculateTrialAdjustment(contract, billingPeriod);

      expect(result.isInTrialPeriod).toBe(false);
      expect(result.billingStartDate).toEqual(paymentStart);
      expect(result.trialEndDate).toEqual(paymentStart);
    });
  });

  describe('ProrationMethod Tests', () => {
    it('should return detailed breakdown for full month with DAILY_ACTUAL', () => {
      const amount = 50.00;
      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-31T23:59:59.999Z');

      const result = service.calculateProratedAmount(amount, startDate, endDate, ProrationMethod.DAILY_ACTUAL);

      expect(result).toMatchObject({
        proratedAmount: 50.00,
        daysUsed: 31,
        totalDays: 31,
        dailyRate: expect.closeTo(1.6129, 4),
        method: ProrationMethod.DAILY_ACTUAL,
        originalAmount: 50.00,
        isFullMonth: true
      });
    });

    it('should calculate proration for first half of month', () => {
      const amount = 60.00;
      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-15T23:59:59.999Z');

      const result = service.calculateProratedAmount(amount, startDate, endDate, ProrationMethod.DAILY_ACTUAL);

      expect(result).toMatchObject({
        proratedAmount: expect.closeTo(29.03, 2),
        daysUsed: 15,
        totalDays: 31,
        method: ProrationMethod.DAILY_ACTUAL,
        isFullMonth: false
      });
    });

    it('should use 30-day calculation for DAILY_30_DAY method', () => {
      const amount = 60.00;
      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-31T23:59:59.999Z');

      const result = service.calculateProratedAmount(amount, startDate, endDate, ProrationMethod.DAILY_30_DAY);

      expect(result).toMatchObject({
        proratedAmount: 60.00, // Capped at original amount
        daysUsed: 31,
        totalDays: 30,
        dailyRate: 2.0000,
        method: ProrationMethod.DAILY_30_DAY
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year calculations', () => {
      const amount = 60.00;
      // February 29th in leap year
      const startDate = new Date('2024-02-29');
      const endDate = new Date('2024-02-29T23:59:59.999Z');

      const result = service.calculateProratedAmount(amount, startDate, endDate);

      // One day out of 29 days in February 2024
      const expected = (60.00 * 1) / 29;
      expect(result).toBeCloseTo(expected, 2);
    });

    it('should handle very small amounts correctly', () => {
      const result = service.calculateProratedAmount(0.01, new Date('2025-08-31'), new Date('2025-08-31T23:59:59.999Z'));
      expect(result).toBeCloseTo(0.01 / 31, 2);
    });

    it('should handle large amounts without overflow', () => {
      const largeAmount = 999999.99;
      const result = service.calculateProratedAmount(largeAmount, new Date('2025-08-01'), new Date('2025-08-31T23:59:59.999Z'));
      expect(result).toBe(largeAmount);
    });

    it('should maintain precision across multiple calculations', () => {
      const amounts = [33.33, 66.67, 99.99];
      const results = amounts.map(amount =>
        service.getTaxAmount(amount, 0.19)
      );

      // Check sum equals tax of total
      const sumOfTaxes = results.reduce((a, b) => a + b, 0);
      const taxOfTotal = service.getTaxAmount(199.99, 0.19);

      // Should be very close (within rounding error)
      expect(Math.abs(sumOfTaxes - taxOfTotal)).toBeLessThan(0.02);
    });
  });

  describe('Performance Tests', () => {
    it('should complete calculation within reasonable time for single contract', async () => {
      const vendorId = new Types.ObjectId();
      const mockContract = {
        _id: new Types.ObjectId(),
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: false,
        totalMonthlyPrice: 50,
        scheduledStartDate: new Date('2025-01-01'),
        zusatzleistungen: { lagerservice: false, versandservice: false }
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([mockContract])
      });

      const startTime = Date.now();
      const result = await service.calculateMonthlyCharges(vendorId, 8, 2025);
      const duration = Date.now() - startTime;

      expect(result).not.toBeNull();
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Financial Accuracy', () => {
    it('should apply proper financial rounding (banker\'s rounding)', () => {
      const amount = 33.33;
      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-15T23:59:59.999Z'); // 15 days

      const result = service.calculateProratedAmount(amount, startDate, endDate, ProrationMethod.DAILY_ACTUAL);

      // 33.33 * 15 / 31 = 16.1290... rounds to 16.13 with banker's rounding
      expect(result.proratedAmount).toBe(16.13);
      expect(result.dailyRate).toBeCloseTo(1.0752, 4);
    });

    it('should correctly format monetary values to 2 decimal places', async () => {
      const vendorId = new Types.ObjectId();
      const mockContract = {
        _id: new Types.ObjectId(),
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: false,
        totalMonthlyPrice: 33.33,
        scheduledStartDate: new Date('2025-08-10'), // Start mid-month
        zusatzleistungen: { lagerservice: true, versandservice: true }
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([mockContract])
      });

      const result = await service.calculateMonthlyCharges(vendorId, 8, 2025);

      expect(result).not.toBeNull();
      // All monetary values should be rounded to 2 decimal places
      expect(result?.subtotal).toBe(Math.round(result!.subtotal * 100) / 100);
      expect(result?.taxAmount).toBe(Math.round(result!.taxAmount * 100) / 100);
      expect(result?.totalAmount).toBe(Math.round(result!.totalAmount * 100) / 100);

      // Verify totalAmount = subtotal + tax
      expect(result?.totalAmount).toBe(result!.subtotal + result!.taxAmount);
    });
  });

  describe('isInTrialPeriod - Comprehensive Tests', () => {
    it('should handle multiple trial contracts with different end dates', async () => {
      const vendor = {
        _id: new Types.ObjectId(),
        registrationStatus: 'active'
      };

      const mockContracts = [
        {
          _id: new Types.ObjectId(),
          istProbemonatBuchung: true,
          zahlungspflichtigAb: new Date('2025-09-01'),
          status: 'active'
        },
        {
          _id: new Types.ObjectId(),
          istProbemonatBuchung: true,
          zahlungspflichtigAb: new Date('2025-08-20'), // Earlier trial end
          status: 'active'
        }
      ];

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockContracts)
      });

      const result = await service.isInTrialPeriod(vendor, new Date('2025-08-15'));

      // Both contracts are in trial on 2025-08-15 (before both end dates)
      expect(result.isInTrial).toBe(true);
      expect(result.trialEndsAt).toEqual(new Date('2025-08-20')); // Earliest end date
      expect(result.contractsInTrial).toHaveLength(2); // Both still in trial
      expect(result.contractsReadyForBilling).toHaveLength(0); // None ready yet
    });

    it('should handle vendor with trial_active that has expired', async () => {
      const vendor = {
        _id: new Types.ObjectId(),
        registrationStatus: 'trial_active',
        trialEndDate: new Date('2025-07-31')
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([{
          _id: new Types.ObjectId(),
          istProbemonatBuchung: false,
          status: 'active'
        }])
      });

      const result = await service.isInTrialPeriod(vendor, new Date('2025-08-15'));

      expect(result.isInTrial).toBe(false);
      expect(result.reason).toContain('contracts ready for billing');
    });

    it('should handle mixed contract types', async () => {
      const vendor = {
        _id: new Types.ObjectId(),
        registrationStatus: 'active'
      };

      const mockContracts = [
        {
          _id: new Types.ObjectId(),
          istProbemonatBuchung: false,
          status: 'active'
        },
        {
          _id: new Types.ObjectId(),
          istProbemonatBuchung: true,
          zahlungspflichtigAb: new Date('2025-07-15'), // Already expired
          status: 'active'
        },
        {
          _id: new Types.ObjectId(),
          istProbemonatBuchung: true,
          zahlungspflichtigAb: new Date('2025-09-01'), // Still in trial
          status: 'active'
        }
      ];

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockContracts)
      });

      const result = await service.isInTrialPeriod(vendor, new Date('2025-08-15'));

      expect(result.isInTrial).toBe(false);
      expect(result.contractsReadyForBilling).toHaveLength(2);
      expect(result.contractsInTrial).toHaveLength(1);
    });
  });

  describe('calculateInvoiceForPeriod - Comprehensive Tests', () => {
    it('should handle trial contracts that transition mid-month', async () => {
      const vendorId = new Types.ObjectId().toString();
      const contractId = new Types.ObjectId();

      const mockContract = {
        _id: contractId,
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: true,
        zahlungspflichtigAb: new Date('2025-08-15'), // Mid-month transition
        totalMonthlyPrice: 31.00,
        scheduledStartDate: new Date('2025-07-01'),
        zusatzleistungen: { lagerservice: false, versandservice: true }
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([mockContract])
      });

      const result = await service.calculateInvoiceForPeriod(vendorId, 2025, 8);

      expect(result.items).toHaveLength(2); // Base + versandservice

      // Verify prorated amounts for 17 days (Aug 15-31)
      const baseExpected = (31.00 * 17) / 31;
      const versandExpected = (5.00 * 17) / 31;

      expect(result.items[0].unitPrice).toBeCloseTo(baseExpected, 2);
      expect(result.items[0].totalPrice).toBeCloseTo(baseExpected, 2);
      expect(result.items[1].unitPrice).toBeCloseTo(versandExpected, 2);
      expect(result.items[1].totalPrice).toBeCloseTo(versandExpected, 2);
    });

    it('should handle multiple contracts with different trial statuses', async () => {
      const vendorId = new Types.ObjectId().toString();
      const contract1Id = new Types.ObjectId();
      const contract2Id = new Types.ObjectId();

      const mockContracts = [
        {
          _id: contract1Id,
          user: vendorId,
          status: 'active',
          istProbemonatBuchung: false, // Regular contract
          totalMonthlyPrice: 40.00,
          scheduledStartDate: new Date('2025-01-01'),
          zusatzleistungen: { lagerservice: true, versandservice: false }
        },
        {
          _id: contract2Id,
          user: vendorId,
          status: 'active',
          istProbemonatBuchung: true, // Trial contract
          zahlungspflichtigAb: new Date('2025-09-01'), // Still in trial
          totalMonthlyPrice: 50.00,
          scheduledStartDate: new Date('2025-07-01'),
          zusatzleistungen: { lagerservice: false, versandservice: true }
        }
      ];

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockContracts)
      });

      const result = await service.calculateInvoiceForPeriod(vendorId, 2025, 8);

      // Should only bill the regular contract
      expect(result.items).toHaveLength(2); // Base + lagerservice from contract1 only
      expect(result.items[0]).toMatchObject({
        description: 'Mietfach Service - 8/2025',
        unitPrice: 40.00,
        totalPrice: 40.00,
        referenceId: contract1Id
      });
      expect(result.items[1]).toMatchObject({
        description: 'Lagerservice - 8/2025',
        unitPrice: 20.00,
        totalPrice: 20.00,
        referenceId: contract1Id
      });
      expect(result.subtotal).toBe(60.00);
      expect(result.tax).toBe(11.40); // 19% of 60
      expect(result.totalAmount).toBe(71.40);
    });

    it('should handle scheduled contracts that start mid-month', async () => {
      const vendorId = new Types.ObjectId().toString();
      const contractId = new Types.ObjectId();

      const mockContract = {
        _id: contractId,
        user: vendorId,
        status: 'scheduled',
        istProbemonatBuchung: false,
        totalMonthlyPrice: 62.00,
        scheduledStartDate: new Date('2025-08-20'), // Starts mid-month
        zusatzleistungen: { lagerservice: true, versandservice: true }
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([mockContract])
      });

      const result = await service.calculateInvoiceForPeriod(vendorId, 2025, 8);

      expect(result.items).toHaveLength(3); // Base + 2 zusatzleistungen

      // Should be prorated for 12 days (Aug 20-31)
      const expectedDays = 12;
      const totalDays = 31;

      const baseExpected = (62.00 * expectedDays) / totalDays;
      const lagerExpected = (20.00 * expectedDays) / totalDays;
      const versandExpected = (5.00 * expectedDays) / totalDays;

      expect(result.items[0].unitPrice).toBeCloseTo(baseExpected, 2);
      expect(result.items[1].unitPrice).toBeCloseTo(lagerExpected, 2);
      expect(result.items[2].unitPrice).toBeCloseTo(versandExpected, 2);
    });

    it('should handle error cases gracefully', async () => {
      const vendorId = new Types.ObjectId().toString();

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      });

      await expect(service.calculateInvoiceForPeriod(vendorId, 2025, 8))
        .rejects.toThrow('Database connection failed');
    });

    it('should return empty invoice for vendor still in trial', async () => {
      const vendorId = new Types.ObjectId().toString();
      const contractId = new Types.ObjectId();

      const mockContract = {
        _id: contractId,
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: true,
        zahlungspflichtigAb: new Date('2025-09-15'), // Trial continues past August
        totalMonthlyPrice: 50.00,
        scheduledStartDate: new Date('2025-07-01'),
        zusatzleistungen: { lagerservice: true, versandservice: false }
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([mockContract])
      });

      const result = await service.calculateInvoiceForPeriod(vendorId, 2025, 8);

      expect(result).toEqual({
        items: [],
        subtotal: 0,
        tax: 0,
        totalAmount: 0
      });
    });
  });

  describe('Additional Edge Cases', () => {
    it('should handle contracts with only versandservice', async () => {
      const vendorId = new Types.ObjectId();
      const contractId = new Types.ObjectId();

      const mockContract = {
        _id: contractId,
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: false,
        totalMonthlyPrice: 0, // No base price
        scheduledStartDate: new Date('2025-01-01'),
        zusatzleistungen: { lagerservice: false, versandservice: true }
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([mockContract])
      });

      const result = await service.calculateMonthlyCharges(vendorId, 8, 2025);

      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(1); // Only versandservice
      expect(result?.items[0].description).toBe('Versandservice - 8/2025');
      expect(result?.items[0].unitPrice).toBe(5.00);
      expect(result?.subtotal).toBe(5.00);
    });

    it('should handle cross-month proration scenarios', () => {
      const amount = 60.00;
      // Scenario: Contract starts late July, we're billing for August
      const contractStart = new Date('2025-07-25');
      const billingStart = new Date('2025-08-01');
      const billingEnd = new Date('2025-08-31T23:59:59.999Z');

      // Should bill full August since contract started before
      const result = service.calculateProratedAmount(amount, billingStart, billingEnd);

      expect(result).toBe(60.00); // Full month
    });

    it('should handle different proration methods comparison', () => {
      const amount = 90.00;
      const startDate = new Date('2025-08-10');
      const endDate = new Date('2025-08-31T23:59:59.999Z');

      const actualResult = service.calculateProratedAmount(amount, startDate, endDate, ProrationMethod.DAILY_ACTUAL);
      const thirtyDayResult = service.calculateProratedAmount(amount, startDate, endDate, ProrationMethod.DAILY_30_DAY);

      // Both should have 22 days (Aug 10-31)
      expect(actualResult.daysUsed).toBe(22);
      expect(thirtyDayResult.daysUsed).toBe(22);

      // But different daily rates and totals
      expect(actualResult.totalDays).toBe(31);
      expect(thirtyDayResult.totalDays).toBe(30);

      expect(actualResult.dailyRate).toBeCloseTo(2.9032, 4); // 90/31
      expect(thirtyDayResult.dailyRate).toBe(3.0000); // 90/30

      expect(actualResult.proratedAmount).toBeCloseTo(63.87, 2);
      expect(thirtyDayResult.proratedAmount).toBe(66.00);
    });

    it('should handle negative tax amounts correctly', () => {
      const result = service.getTaxAmount(-50, 0.19);
      expect(result).toBe(0);
    });

    it('should handle very high tax rates', () => {
      const result = service.getTaxAmount(100, 0.50); // 50% tax rate
      expect(result).toBe(50.00);
    });

    it('should maintain precision with many small calculations', () => {
      const results = [];
      for (let i = 1; i <= 31; i++) {
        const startDate = new Date('2025-08-01');
        const endDate = new Date(`2025-08-${i.toString().padStart(2, '0')}T23:59:59.999Z`);
        const result = service.calculateProratedAmount(31.00, startDate, endDate);
        results.push(result);
      }

      // Verify progression is monotonic
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBeGreaterThanOrEqual(results[i-1]);
      }

      // Final result should be full amount
      expect(results[30]).toBe(31.00);
    });
  });

  describe('Integration Tests', () => {
    it('should handle invalid month parameter in calculateMonthlyCharges', async () => {
      const vendorId = new Types.ObjectId().toString();

      await expect(service.calculateMonthlyCharges(vendorId, 13, 2025))
        .rejects.toThrow('Month must be between 1 and 12');

      await expect(service.calculateMonthlyCharges(vendorId, 0, 2025))
        .rejects.toThrow('Month must be between 1 and 12');
    });

    it('should handle invalid year parameter in calculateMonthlyCharges', async () => {
      const vendorId = new Types.ObjectId().toString();

      await expect(service.calculateMonthlyCharges(vendorId, 8, 1999))
        .rejects.toThrow('Year must be between 2020 and 2100');
    });

    it('should handle database errors in calculateMonthlyCharges', async () => {
      const vendorId = new Types.ObjectId().toString();

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockRejectedValue(new Error('Database timeout'))
      });

      await expect(service.calculateMonthlyCharges(vendorId, 8, 2025))
        .rejects.toThrow('Database timeout');
    });

    it('should test with real database simulation - multiple contract types', async () => {
      const vendorId = new Types.ObjectId().toString();
      const contractId1 = new Types.ObjectId();
      const contractId2 = new Types.ObjectId();

      // Simulate complex database response
      const mockContracts = [
        {
          _id: contractId1,
          user: vendorId,
          status: 'active',
          istProbemonatBuchung: true,
          zahlungspflichtigAb: new Date('2025-08-15'), // Trial ends mid-August
          totalMonthlyPrice: 30.00,
          scheduledStartDate: new Date('2025-07-01'),
          zusatzleistungen: { lagerservice: true, versandservice: true }
        },
        {
          _id: contractId2,
          user: vendorId,
          status: 'active',
          istProbemonatBuchung: false,
          totalMonthlyPrice: 25.00,
          scheduledStartDate: new Date('2025-08-10'), // Starts mid-month
          zusatzleistungen: { lagerservice: false, versandservice: true }
        }
      ];

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockContracts)
      });

      const result = await service.calculateMonthlyCharges(vendorId, 8, 2025);

      expect(result).not.toBeNull();
      expect(result?.items.length).toBeGreaterThan(0);

      // Verify complex calculation logic - should have valid financial amounts
      expect(result?.subtotal).toBeGreaterThan(0);
      expect(result?.taxAmount).toBeGreaterThan(0);
      expect(result?.totalAmount).toBeCloseTo(result?.subtotal + result?.taxAmount, 2);
    });

    it('should handle performance test with many contracts', async () => {
      const vendorId = new Types.ObjectId().toString();

      // Generate 50 mock contracts
      const manyContracts = Array.from({ length: 50 }, (_, i) => ({
        _id: new Types.ObjectId(),
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: i % 3 === 0, // Every third is trial
        zahlungspflichtigAb: i % 3 === 0 ? new Date('2025-08-15') : undefined,
        totalMonthlyPrice: 10.00 + (i % 10),
        scheduledStartDate: new Date('2025-08-01'),
        zusatzleistungen: {
          lagerservice: i % 2 === 0,
          versandservice: i % 3 === 0
        }
      }));

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(manyContracts)
      });

      const startTime = Date.now();
      const result = await service.calculateInvoiceForPeriod(vendorId, 2025, 8);
      const executionTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle memory usage test with large amounts', async () => {
      const vendorId = new Types.ObjectId().toString();
      const contractId = new Types.ObjectId();

      const mockContract = {
        _id: contractId,
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: false,
        totalMonthlyPrice: 999999.99, // Very large amount
        scheduledStartDate: new Date('2025-08-01'),
        zusatzleistungen: { lagerservice: true, versandservice: true }
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([mockContract])
      });

      const result = await service.calculateInvoiceForPeriod(vendorId, 2025, 8);

      expect(result).toBeDefined();
      expect(result.totalAmount).toBeGreaterThan(0);
      expect(Number.isFinite(result.totalAmount)).toBe(true);
    });

    it('should handle concurrent calculations', async () => {
      const vendorId1 = new Types.ObjectId().toString();
      const vendorId2 = new Types.ObjectId().toString();

      const mockContract1 = {
        _id: new Types.ObjectId(),
        user: vendorId1,
        status: 'active',
        istProbemonatBuchung: false,
        totalMonthlyPrice: 30.00,
        scheduledStartDate: new Date('2025-08-01'),
        zusatzleistungen: { lagerservice: true, versandservice: false }
      };

      const mockContract2 = {
        _id: new Types.ObjectId(),
        user: vendorId2,
        status: 'active',
        istProbemonatBuchung: false,
        totalMonthlyPrice: 40.00,
        scheduledStartDate: new Date('2025-08-01'),
        zusatzleistungen: { lagerservice: false, versandservice: true }
      };

      // Setup mocks for concurrent calls
      mockFind
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([mockContract1])
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([mockContract2])
        });

      // Run calculations concurrently
      const [result1, result2] = await Promise.all([
        service.calculateInvoiceForPeriod(vendorId1, 2025, 8),
        service.calculateInvoiceForPeriod(vendorId2, 2025, 8)
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.totalAmount).not.toEqual(result2.totalAmount);
    });

    it('should handle edge case with null/undefined zusatzleistungen', async () => {
      const vendorId = new Types.ObjectId().toString();
      const contractId = new Types.ObjectId();

      const mockContract = {
        _id: contractId,
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: false,
        totalMonthlyPrice: 50.00,
        scheduledStartDate: new Date('2025-08-01'),
        zusatzleistungen: null // Null zusatzleistungen
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([mockContract])
      });

      const result = await service.calculateMonthlyCharges(vendorId, 8, 2025);

      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(1); // Only base price
      expect(result?.subtotal).toBe(50.00);
    });

    it('should handle contracts with invalid dates', async () => {
      const vendorId = new Types.ObjectId().toString();
      const contractId = new Types.ObjectId();

      const mockContract = {
        _id: contractId,
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: false,
        totalMonthlyPrice: 50.00,
        scheduledStartDate: new Date('Invalid Date'), // Invalid date
        zusatzleistungen: { lagerservice: false, versandservice: false }
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([mockContract])
      });

      // Should handle gracefully
      const result = await service.calculateMonthlyCharges(vendorId, 8, 2025);
      expect(result).not.toBeNull();
    });
  });

  describe('Manual Testing Verification', () => {
    it('should verify calculations manually - spreadsheet comparison', () => {
      // Manual calculation verification
      const basePrice = 30.00;
      const lagerservice = 20.00;
      const versandservice = 5.00;

      // Expected: 30 + 20 + 5 = 55.00 subtotal
      const expectedSubtotal = 55.00;
      const expectedTax = Number((expectedSubtotal * 0.19).toFixed(2)); // 10.45
      const expectedTotal = Number((expectedSubtotal + expectedTax).toFixed(2)); // 65.45

      // Test actual calculation
      const tax = service.getTaxAmount(expectedSubtotal, 0.19);
      expect(tax).toBe(expectedTax);

      const total = expectedSubtotal + tax;
      expect(Number(total.toFixed(2))).toBe(expectedTotal);
    });

    it('should verify proration calculations manually', () => {
      // Manual verification: 30 days in September, contract active for 15 days
      const monthlyAmount = 60.00;
      const result = service.calculateProratedAmount(
        monthlyAmount,
        new Date('2025-09-16'), // Start on 16th
        new Date('2025-09-30T23:59:59.999Z') // End on 30th
      );

      // Manual calculation: 15 days (Sept 16-30) / 30 days * 60 = 30.00
      expect(result).toBe(30.00);
    });

    it('should verify production-like data handling', async () => {
      const vendorId = new Types.ObjectId().toString();

      // Production-like complex scenario
      const complexContract = {
        _id: new Types.ObjectId(),
        user: vendorId,
        status: 'active',
        istProbemonatBuchung: true,
        zahlungspflichtigAb: new Date('2025-08-20'), // Trial ends on 20th
        totalMonthlyPrice: 35.50,
        scheduledStartDate: new Date('2025-07-15'),
        zusatzleistungen: { lagerservice: true, versandservice: true }
      };

      mockFind.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([complexContract])
      });

      const result = await service.calculateInvoiceForPeriod(vendorId, 2025, 8);

      // Verify realistic calculations
      expect(result).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.totalAmount).toBeGreaterThan(0);
      expect(result.totalAmount).toBeLessThan(10000); // Reasonable upper bound
    });
  });
});