/**
 * @file revenueAdminController.ts
 * @purpose Revenue management admin controllers extracted from adminController.ts
 * @created 2026-03-25
 */

import { Request, Response } from 'express';
import Vertrag from '../../models/Vertrag';
import { revenueService } from '../../services/revenueService';
import logger from '../../utils/logger';

// ===============================================
// REVENUE MANAGEMENT CONTROLLERS (M006)
// ===============================================

/**
 * Get revenue overview - Monthly revenue summary
 */
export const getRevenueOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, includeTrialRevenue } = req.query;

    logger.info('🔍 getRevenueOverview called with:', { startDate, endDate, includeTrialRevenue });

    // Parse date range or use defaults
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    logger.info('🔍 Date range:', { start, end });

    // Get current month revenue (including future projections)
    const now = new Date();
    let currentMonthRevenue;

    // Always use date range to get revenue data
    const includeTrials = includeTrialRevenue === 'true';
    const revenueRange = await revenueService.getCombinedRevenueRange(
      start.getFullYear(),
      start.getMonth() + 1,
      end.getFullYear(),
      end.getMonth() + 1,
      includeTrials
    );

    logger.info('🔍 Combined revenue data retrieved:', { months: revenueRange.length });
    logger.info('🔍 Date range:', { start: start.toISOString(), end: end.toISOString() });
    revenueRange.forEach(r => {
      logger.debug('🔍 Month data:', { month: r.monat, revenue: r.gesamteinnahmen, type: r.isProjection ? 'projection' : 'historical' });
    });

    // Use the latest month as current month revenue
    currentMonthRevenue = revenueRange[revenueRange.length - 1] || await revenueService.getMonthlyRevenue(now.getFullYear(), now.getMonth() + 1);

    // Create trends from combined data
    const monthlyTrends = revenueRange.map((month, index) => {
      const previous = index > 0 ? revenueRange[index - 1] : null;
      const growthRate = previous
        ? ((month.gesamteinnahmen - previous.gesamteinnahmen) / previous.gesamteinnahmen) * 100
        : 0;

      return {
        month: month.monat,
        revenue: month.gesamteinnahmen,
        growthRate,
        contracts: month.anzahlAktiveVertraege,
        trialContracts: month.anzahlProbemonatVertraege,
        isProjection: month.isProjection || false
      };
    });

    // Calculate totals and averages from combined data
    const totalRevenue = revenueRange.reduce((sum, month) => sum + month.gesamteinnahmen, 0);
    const monthlyAverage = revenueRange.length > 0 ? totalRevenue / revenueRange.length : 0;

    logger.info('🔍 Calculated totals:', { totalRevenue, monthlyAverage, monthsCount: revenueRange.length });

    const trends = { monthlyTrends };
    const finalTotalRevenue = totalRevenue;
    const finalMonthlyAverage = monthlyAverage;

    // Get revenue statistics
    const _statistics = await revenueService.getRevenueStatistics();

    // Calculate contract totals
    const totalActiveContracts = currentMonthRevenue?.anzahlAktiveVertraege || 0;
    const totalTrialContracts = currentMonthRevenue?.anzahlProbemonatVertraege || 0;

    // Calculate occupancy rate (dummy calculation - should be based on actual Mietfach availability)
    const occupancyRate = totalActiveContracts > 0 ? Math.min(100, (totalActiveContracts / 50) * 100) : 0;

    // Create revenue trend (compare current month vs previous month)
    const trendData = trends.monthlyTrends || [];
    const currentRevenue = trendData[trendData.length - 1]?.revenue || 0;
    const previousRevenue = trendData[trendData.length - 2]?.revenue || 0;
    const revenueTrendPercentage = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Format data for frontend
    const revenueByMonth = trendData.map((month: any) => ({
      month: month.month.toISOString(),
      revenue: month.revenue || 0,
      contracts: month.contracts || 0,
      trialContracts: month.trialContracts || 0,
      isProjection: month.isProjection || false
    }));

    res.json({
      success: true,
      data: {
        totalRevenue: finalTotalRevenue,
        monthlyAverage: finalMonthlyAverage,
        totalActiveContracts,
        totalTrialContracts,
        occupancyRate,
        revenueTrend: {
          direction: revenueTrendPercentage > 0 ? 'up' : revenueTrendPercentage < 0 ? 'down' : 'neutral',
          percentage: Math.abs(revenueTrendPercentage)
        },
        occupancyTrend: {
          direction: 'neutral',
          percentage: 0
        },
        revenueByMonth
      }
    });
  } catch (error) {
    logger.error('Error getting revenue overview:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Einnahmen-Übersicht'
    });
  }
};

/**
 * Get revenue breakdown by unit (Mietfach)
 */
export const getRevenueByUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, page = 1, limit = 20, sort = 'revenue', direction = 'desc', filter = '' } = req.query;

    // Parse parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const sortField = sort as string;
    const sortDir = direction as string;
    const searchFilter = filter as string;

    // Parse date range or use defaults
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get Mietfach data with revenue information - using existing imports

    // Aggregate revenue by Mietfach
    const mietfaecherRevenue = await Vertrag.aggregate([
      {
        $match: {
          mietbeginn: { $lte: end },
          $or: [
            { mietende: { $gte: start } },
            { mietende: null }
          ],
          status: { $in: ['aktiv', 'kuendigung_erhalten'] }
        }
      },
      {
        $lookup: {
          from: 'mietfaechers',
          localField: 'mietfachId',
          foreignField: '_id',
          as: 'mietfach'
        }
      },
      {
        $unwind: '$mietfach'
      },
      {
        $group: {
          _id: '$mietfachId',
          mietfachNummer: { $first: '$mietfach.bezeichnung' },
          kategorie: { $first: '$mietfach.kategorie' },
          status: { $first: { $cond: [{ $eq: ['$status', 'aktiv'] }, 'occupied', 'available'] } },
          revenue: { $sum: { $multiply: ['$monatlicheGebuehr', { $divide: [{ $subtract: [end, start] }, 1000 * 60 * 60 * 24 * 30] }] } },
          contracts: { $sum: 1 },
          isTrialActive: { $max: '$probemonat' }
        }
      }
    ]);

    // Apply filtering
    let filteredData = mietfaecherRevenue;
    if (searchFilter) {
      filteredData = mietfaecherRevenue.filter((item: any) =>
        item.mietfachNummer?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.kategorie?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    // Apply sorting
    filteredData.sort((a: any, b: any) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;

      if (sortField === 'mietfachNummer' || sortField === 'kategorie') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Apply pagination
    const totalCount = filteredData.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedData = filteredData.slice(startIndex, startIndex + limitNum);

    // Format data for frontend
    const units = paginatedData.map((item: any) => ({
      mietfachId: item._id.toString(),
      mietfachNummer: item.mietfachNummer || `Mietfach-${item._id.toString().slice(-6)}`,
      kategorie: item.kategorie || 'Standard',
      revenue: Math.round(item.revenue || 0),
      contracts: item.contracts || 0,
      isTrialActive: Boolean(item.isTrialActive),
      status: item.status || 'available'
    }));

    res.json({
      success: true,
      data: {
        units,
        totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    logger.error('Error getting revenue by unit:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Einnahmen nach Mietfächern'
    });
  }
};

/**
 * Get detailed monthly revenue breakdown
 */
export const getMonthlyRevenueDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, month } = req.params;
    const yearNumber = parseInt(year, 10);
    const monthNumber = parseInt(month, 10);

    if (isNaN(yearNumber) || isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      res.status(400).json({
        success: false,
        message: 'Ungültiges Jahr oder Monat'
      });
      return;
    }

    // Calculate revenue for the month (if not already calculated)
    const monthlyRevenue = await revenueService.calculateMonthlyRevenue(yearNumber, monthNumber);

    // Get Mietfach analysis
    const mietfachAnalysis = await revenueService.getMietfachAnalysis(yearNumber, monthNumber);

    res.json({
      success: true,
      data: {
        monthlyRevenue,
        mietfachAnalysis
      }
    });
  } catch (error) {
    logger.error('Error getting monthly revenue details:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der monatlichen Einnahmen-Details'
    });
  }
};

/**
 * Export revenue data to CSV
 */
export const exportRevenueData = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      startYear,
      startMonth,
      endYear,
      endMonth,
      type = 'summary',
      detailYear,
      detailMonth
    } = req.query;

    let csvData: string;
    let filename: string;

    if (type === 'detailed' && detailYear && detailMonth) {
      // Export detailed Mietfach data for a specific month
      const yearNumber = parseInt(detailYear as string, 10);
      const monthNumber = parseInt(detailMonth as string, 10);

      csvData = await revenueService.exportMietfachRevenueToCSV(yearNumber, monthNumber);
      filename = `mietfach-einnahmen-${yearNumber}-${monthNumber.toString().padStart(2, '0')}.csv`;
    } else if (startYear && startMonth && endYear && endMonth) {
      // Export summary data for a date range
      const startYearNumber = parseInt(startYear as string, 10);
      const startMonthNumber = parseInt(startMonth as string, 10);
      const endYearNumber = parseInt(endYear as string, 10);
      const endMonthNumber = parseInt(endMonth as string, 10);

      csvData = await revenueService.exportRevenueToCSV(
        startYearNumber,
        startMonthNumber,
        endYearNumber,
        endMonthNumber
      );
      filename = `einnahmen-uebersicht-${startYearNumber}${startMonthNumber.toString().padStart(2, '0')}-${endYearNumber}${endMonthNumber.toString().padStart(2, '0')}.csv`;
    } else {
      res.status(400).json({
        success: false,
        message: 'Fehlende oder ungültige Parameter für den Export'
      });
      return;
    }

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    });

    res.send('\ufeff' + csvData); // Add BOM for proper UTF-8 encoding in Excel
  } catch (error) {
    logger.error('Error exporting revenue data:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Exportieren der Einnahmen-Daten'
    });
  }
};

/**
 * Get revenue trend data for charts
 */
export const getRevenueTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const { months = 12 } = req.query;
    const monthsNumber = parseInt(months as string, 10);

    const trends = await revenueService.getRevenueTrends(monthsNumber);

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    logger.error('Error getting revenue trends:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Einnahmen-Trends'
    });
  }
};

/**
 * Refresh revenue data for all months (maintenance endpoint)
 */
export const refreshRevenueData = async (req: Request, res: Response): Promise<void> => {
  try {
    await revenueService.refreshAllRevenueData();

    res.json({
      success: true,
      message: 'Einnahmen-Daten wurden erfolgreich aktualisiert'
    });
  } catch (error) {
    logger.error('Error refreshing revenue data:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Einnahmen-Daten'
    });
  }
};

/**
 * Get Mietfach occupancy and performance analysis
 */
export const getMietfachAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const yearNumber = year ? parseInt(year as string, 10) : now.getFullYear();
    const monthNumber = month ? parseInt(month as string, 10) : now.getMonth() + 1;

    if (isNaN(yearNumber) || isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      res.status(400).json({
        success: false,
        message: 'Ungültiges Jahr oder Monat'
      });
      return;
    }

    const analysis = await revenueService.getMietfachAnalysis(yearNumber, monthNumber);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error getting Mietfach analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Mietfach-Analyse'
    });
  }
};

/**
 * Manually trigger revenue calculation job
 */
export const triggerRevenueCalculation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, month } = req.body;

    // Import dynamically to avoid circular dependency issues
    const ScheduledJobs = (await import('../../services/scheduledJobs')).default;

    const result = await ScheduledJobs.triggerRevenueCalculation(
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined
    );

    if (result.success) {
      res.json({
        success: true,
        message: `Revenue calculation triggered successfully for ${result.period}`,
        timestamp: result.timestamp
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: result.timestamp
      });
    }
  } catch (error) {
    logger.error('Error triggering revenue calculation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger revenue calculation'
    });
  }
};

/**
 * Get future revenue projections
 */
export const getFutureRevenueProjections = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startYear, startMonth, endYear, endMonth, months } = req.query;

    let projections;

    if (startYear && startMonth && endYear && endMonth) {
      // Specific date range
      projections = await revenueService.getFutureRevenueRange(
        parseInt(startYear as string),
        parseInt(startMonth as string),
        parseInt(endYear as string),
        parseInt(endMonth as string)
      );
    } else {
      // Default: next 12 months
      const now = new Date();
      const monthsToProject = months ? parseInt(months as string) : 12;
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + monthsToProject);

      projections = await revenueService.getFutureRevenueRange(
        now.getFullYear(),
        now.getMonth() + 1,
        endDate.getFullYear(),
        endDate.getMonth() + 1
      );
    }

    res.json({
      success: true,
      data: {
        projections,
        totalProjectedRevenue: projections.reduce((sum: number, p: any) => sum + p.gesamteinnahmen, 0),
        averageMonthlyRevenue: projections.length > 0
          ? projections.reduce((sum: number, p: any) => sum + p.gesamteinnahmen, 0) / projections.length
          : 0
      }
    });
  } catch (error) {
    logger.error('Error getting future revenue projections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get future revenue projections'
    });
  }
};

/**
 * Get combined historical and future revenue data
 */
export const getCombinedRevenueData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startYear, startMonth, endYear, endMonth } = req.query;

    logger.info('🔍 getCombinedRevenueData called with:', { startYear, startMonth, endYear, endMonth });

    // Validate required parameters
    if (!startYear || !startMonth || !endYear || !endMonth) {
      res.status(400).json({
        success: false,
        error: 'startYear, startMonth, endYear, and endMonth are required'
      });
      return;
    }

    const combinedData = await revenueService.getCombinedRevenueRange(
      parseInt(startYear as string),
      parseInt(startMonth as string),
      parseInt(endYear as string),
      parseInt(endMonth as string)
    );

    logger.info('🔍 Combined revenue data retrieved:', { months: combinedData.length });
    combinedData.forEach(item => {
      logger.debug('🔍 Monthly data:', { month: item.monat.toISOString().substring(0, 7), revenue: item.gesamteinnahmen, type: item.isProjection ? 'projection' : 'historical', contracts: item.anzahlAktiveVertraege });
    });

    // Separate historical and projected data
    const historicalData = combinedData.filter(item => !item.isProjection);
    const projectedData = combinedData.filter(item => item.isProjection);

    const totalHistoricalRevenue = historicalData.reduce((sum: number, item: any) => sum + item.gesamteinnahmen, 0);
    const totalProjectedRevenue = projectedData.reduce((sum: number, item: any) => sum + item.gesamteinnahmen, 0);

    logger.info('🔍 Revenue totals:', {
      historical: totalHistoricalRevenue,
      projected: totalProjectedRevenue,
      total: totalHistoricalRevenue + totalProjectedRevenue
    });

    res.json({
      success: true,
      data: {
        combined: combinedData,
        historical: historicalData,
        projected: projectedData,
        totalHistoricalRevenue,
        totalProjectedRevenue
      }
    });
  } catch (error) {
    logger.error('Error getting combined revenue data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get combined revenue data'
    });
  }
};

/**
 * Get contract pipeline for future planning
 */
export const getContractPipeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const { months } = req.query;
    const monthsToShow = months ? parseInt(months as string) : 12;

    const pipeline = await revenueService.getContractPipeline(monthsToShow);

    // Group by month for better visualization
    const pipelineByMonth: { [key: string]: any[] } = {};

    pipeline.forEach(contract => {
      const monthKey = contract.startDate.toISOString().substring(0, 7); // YYYY-MM
      if (!pipelineByMonth[monthKey]) {
        pipelineByMonth[monthKey] = [];
      }
      pipelineByMonth[monthKey].push(contract);
    });

    res.json({
      success: true,
      data: {
        pipeline,
        pipelineByMonth,
        totalUpcomingRevenue: pipeline.reduce((sum: number, contract: any) => sum + contract.monthlyRevenue, 0),
        upcomingTrialConversions: pipeline.filter((contract: any) => contract.isTrialBooking).length
      }
    });
  } catch (error) {
    logger.error('Error getting contract pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contract pipeline'
    });
  }
};

/**
 * Get projected occupancy rates
 */
export const getProjectedOccupancy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { months } = req.query;
    const monthsToProject = months ? parseInt(months as string) : 12;

    const occupancyProjections = await revenueService.getProjectedOccupancy(monthsToProject);

    res.json({
      success: true,
      data: {
        projections: occupancyProjections,
        averageProjectedOccupancy: occupancyProjections.length > 0
          ? occupancyProjections.reduce((sum: number, proj: any) => sum + proj.occupancyRate, 0) / occupancyProjections.length
          : 0
      }
    });
  } catch (error) {
    logger.error('Error getting projected occupancy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get projected occupancy'
    });
  }
};
