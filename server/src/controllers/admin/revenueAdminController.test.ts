/**
 * @file revenueAdminController.test.ts
 * @purpose Unit tests for admin revenue management endpoints
 * @created 2026-03-29
 */

jest.mock('../../models/Vertrag');
jest.mock('../../services/revenueService', () => ({
  revenueService: {
    getCombinedRevenueRange: jest.fn(),
    getMonthlyRevenue: jest.fn(),
    getRevenueStatistics: jest.fn(),
    getRevenueTrends: jest.fn(),
    refreshAllRevenueData: jest.fn(),
    getMietfachAnalysis: jest.fn(),
    calculateMonthlyRevenue: jest.fn(),
    getFutureRevenueRange: jest.fn(),
    getContractPipeline: jest.fn(),
    getProjectedOccupancy: jest.fn(),
    exportRevenueToCSV: jest.fn(),
    exportMietfachRevenueToCSV: jest.fn(),
  },
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

import { Request, Response } from 'express';
import {
  getRevenueOverview,
  getRevenueTrends,
  refreshRevenueData,
  getMonthlyRevenueDetails,
  triggerRevenueCalculation,
  getMietfachAnalysis,
} from './revenueAdminController';
import { revenueService } from '../../services/revenueService';

describe('revenueAdminController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = { json: jsonMock, status: statusMock } as Partial<Response>;
    jest.clearAllMocks();
  });

  describe('getRevenueOverview', () => {
    it('should return revenue overview with default date range', async () => {
      req = { query: {} };
      const mockMonthData = {
        monat: new Date('2026-03-01'),
        gesamteinnahmen: 5000,
        anzahlAktiveVertraege: 10,
        anzahlProbemonatVertraege: 2,
        isProjection: false,
      };
      (revenueService.getCombinedRevenueRange as jest.Mock).mockResolvedValue([mockMonthData]);
      (revenueService.getRevenueStatistics as jest.Mock).mockResolvedValue({});

      await getRevenueOverview(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRevenue: 5000,
            totalActiveContracts: 10,
            totalTrialContracts: 2,
          }),
        }),
      );
    });

    it('should parse custom date range', async () => {
      req = { query: { startDate: '2025-01-01', endDate: '2025-12-31' } };
      (revenueService.getCombinedRevenueRange as jest.Mock).mockResolvedValue([]);
      (revenueService.getMonthlyRevenue as jest.Mock).mockResolvedValue({
        gesamteinnahmen: 0,
        anzahlAktiveVertraege: 0,
        anzahlProbemonatVertraege: 0,
      });
      (revenueService.getRevenueStatistics as jest.Mock).mockResolvedValue({});

      await getRevenueOverview(req as Request, res as Response);

      expect(revenueService.getCombinedRevenueRange).toHaveBeenCalledWith(
        2025, 1, 2025, 12, false,
      );
    });

    it('should include trial revenue when requested', async () => {
      req = { query: { includeTrialRevenue: 'true' } };
      (revenueService.getCombinedRevenueRange as jest.Mock).mockResolvedValue([]);
      (revenueService.getMonthlyRevenue as jest.Mock).mockResolvedValue({
        gesamteinnahmen: 0,
        anzahlAktiveVertraege: 0,
        anzahlProbemonatVertraege: 0,
      });
      (revenueService.getRevenueStatistics as jest.Mock).mockResolvedValue({});

      await getRevenueOverview(req as Request, res as Response);

      expect(revenueService.getCombinedRevenueRange).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number),
        expect.any(Number), expect.any(Number),
        true,
      );
    });

    it('should calculate growth between months', async () => {
      req = { query: {} };
      const months = [
        { monat: new Date('2026-01-01'), gesamteinnahmen: 1000, anzahlAktiveVertraege: 5, anzahlProbemonatVertraege: 0, isProjection: false },
        { monat: new Date('2026-02-01'), gesamteinnahmen: 1500, anzahlAktiveVertraege: 7, anzahlProbemonatVertraege: 1, isProjection: false },
      ];
      (revenueService.getCombinedRevenueRange as jest.Mock).mockResolvedValue(months);
      (revenueService.getRevenueStatistics as jest.Mock).mockResolvedValue({});

      await getRevenueOverview(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRevenue: 2500,
            monthlyAverage: 1250,
            revenueTrend: expect.objectContaining({ direction: 'up' }),
          }),
        }),
      );
    });

    it('should return 500 on error', async () => {
      req = { query: {} };
      (revenueService.getCombinedRevenueRange as jest.Mock).mockRejectedValue(new Error('DB error'));

      await getRevenueOverview(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getRevenueTrends', () => {
    it('should return trends data', async () => {
      req = { query: {} };
      (revenueService.getRevenueTrends as jest.Mock).mockResolvedValue({
        trends: [{ month: '2026-01', revenue: 5000 }],
        summary: { avgGrowth: 5 },
      });

      await getRevenueTrends(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('should return 500 on error', async () => {
      req = { query: {} };
      (revenueService.getRevenueTrends as jest.Mock).mockRejectedValue(new Error('fail'));

      await getRevenueTrends(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('refreshRevenueData', () => {
    it('should refresh and return success', async () => {
      req = { query: {} };
      (revenueService.refreshAllRevenueData as jest.Mock).mockResolvedValue(undefined);

      await refreshRevenueData(req as Request, res as Response);

      expect(revenueService.refreshAllRevenueData).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('should return 500 on error', async () => {
      req = { query: {} };
      (revenueService.refreshAllRevenueData as jest.Mock).mockRejectedValue(new Error('fail'));

      await refreshRevenueData(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getMonthlyRevenueDetails', () => {
    it('should return details for specific month', async () => {
      req = { params: { year: '2026', month: '3' }, query: {} };
      (revenueService.calculateMonthlyRevenue as jest.Mock).mockResolvedValue({
        monat: new Date('2026-03-01'),
        gesamteinnahmen: 3000,
      });
      (revenueService.getMietfachAnalysis as jest.Mock).mockResolvedValue({
        mietfaecher: [],
      });

      await getMonthlyRevenueDetails(req as Request, res as Response);

      expect(revenueService.calculateMonthlyRevenue).toHaveBeenCalledWith(2026, 3);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('should return 400 for invalid month', async () => {
      req = { params: { year: '2026', month: '13' }, query: {} };

      await getMonthlyRevenueDetails(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      req = { params: { year: '2026', month: '3' }, query: {} };
      (revenueService.calculateMonthlyRevenue as jest.Mock).mockRejectedValue(new Error('fail'));

      await getMonthlyRevenueDetails(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('triggerRevenueCalculation', () => {
    beforeEach(() => {
      jest.mock('../../services/scheduledJobs', () => ({
        __esModule: true,
        default: {
          triggerRevenueCalculation: jest.fn().mockResolvedValue({
            success: true,
            period: '2026-03',
            timestamp: new Date(),
          }),
        },
      }));
    });

    it('should trigger calculation and return success', async () => {
      req = { body: {}, query: {} };

      await triggerRevenueCalculation(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe('getMietfachAnalysis', () => {
    it('should return analysis data', async () => {
      req = { query: {} };
      (revenueService.getMietfachAnalysis as jest.Mock).mockResolvedValue({
        mietfaecher: [],
        summary: { total: 0 },
      });

      await getMietfachAnalysis(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('should return 500 on error', async () => {
      req = { query: {} };
      (revenueService.getMietfachAnalysis as jest.Mock).mockRejectedValue(new Error('fail'));

      await getMietfachAnalysis(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
