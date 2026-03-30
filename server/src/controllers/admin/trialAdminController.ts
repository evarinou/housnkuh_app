/**
 * @file trialAdminController.ts
 * @purpose Admin trial lifecycle management — statistics, activation, extension, bulk updates, audit
 * @created 2026-03-29
 */

import { Request, Response } from 'express';
import ScheduledJobs from '../../services/scheduledJobs';
import logger from '../../utils/logger';

// Get trial statistics for admin dashboard
export const getTrialStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ScheduledJobs.getTrialStatistics();

    if (result.success) {
      res.json({
        success: true,
        statistics: result.statistics,
        timestamp: result.timestamp,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to get trial statistics',
      });
    }
  } catch (err) {
    logger.error('Error getting trial statistics:', err);
    res.status(500).json({
      success: false,
      message: 'Server error getting trial statistics',
    });
  }
};

// Manually trigger trial activation check
export const triggerTrialActivation = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ScheduledJobs.triggerTrialActivationCheck();

    if (result.success) {
      res.json({
        success: true,
        message: 'Trial activation check completed successfully',
        activated: result.activated,
        timestamp: result.timestamp,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Trial activation check failed',
      });
    }
  } catch (err) {
    logger.error('Error triggering trial activation:', err);
    res.status(500).json({
      success: false,
      message: 'Server error triggering trial activation',
    });
  }
};

// Manually trigger trial status update
export const triggerTrialStatusUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ScheduledJobs.triggerTrialStatusUpdate();

    if (result.success) {
      res.json({
        success: true,
        message: 'Trial status update completed successfully',
        result: result.result,
        timestamp: result.timestamp,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Trial status update failed',
      });
    }
  } catch (err) {
    logger.error('Error triggering trial status update:', err);
    res.status(500).json({
      success: false,
      message: 'Server error triggering trial status update',
    });
  }
};

// Manually activate trial for specific vendor
export const activateVendorTrial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      res.status(400).json({
        success: false,
        message: 'Vendor ID is required',
      });
      return;
    }

    const result = await ScheduledJobs.activateVendorTrial(vendorId);

    if (result.success) {
      res.json({
        success: true,
        message: `Trial activated successfully for vendor ${vendorId}`,
        vendorId: result.vendorId,
        timestamp: result.timestamp,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to activate vendor trial',
      });
    }
  } catch (err) {
    logger.error('Error activating vendor trial:', err);
    res.status(500).json({
      success: false,
      message: 'Server error activating vendor trial',
    });
  }
};

// Extend vendor trial
export const extendVendorTrial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { extensionDays, reason } = req.body;
    const adminUser = (req as any).user;

    if (!extensionDays || extensionDays <= 0) {
      res.status(400).json({
        success: false,
        message: 'Extension days must be a positive number',
      });
      return;
    }

    const { trialManagementService } = await import('../../services/trialManagementService');
    const result = await trialManagementService.extendTrial(
      userId,
      extensionDays,
      adminUser?.kontakt?.email || 'admin',
      reason,
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          userId: result.userId,
          username: result.username,
          previousEndDate: result.previousEndDate,
          newEndDate: result.newEndDate,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to extend trial',
      });
    }
  } catch (err) {
    logger.error('Error extending vendor trial:', err);
    res.status(500).json({
      success: false,
      message: 'Server error extending trial',
    });
  }
};

// Bulk update trials
export const bulkUpdateTrials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIds, action, extensionDays, reason } = req.body;
    const adminUser = (req as any).user;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'userIds must be a non-empty array',
      });
      return;
    }

    if (!['extend', 'expire', 'reset_reminders'].includes(action)) {
      res.status(400).json({
        success: false,
        message: 'Action must be one of: extend, expire, reset_reminders',
      });
      return;
    }

    const { trialManagementService } = await import('../../services/trialManagementService');
    const result = await trialManagementService.bulkUpdateTrialStatus(
      userIds,
      action,
      adminUser?.kontakt?.email || 'admin',
      { extensionDays, reason },
    );

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      data: result,
    });
  } catch (err) {
    logger.error('Error in bulk trial update:', err);
    res.status(500).json({
      success: false,
      message: 'Server error in bulk update',
    });
  }
};

// Get trial audit log
export const getTrialAuditLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, action, performedBy, startDate, endDate, limit } = req.query;

    const filters: any = {};
    if (userId) filters.userId = userId as string;
    if (action) filters.action = action as string;
    if (performedBy) filters.performedBy = performedBy as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const { trialManagementService } = await import('../../services/trialManagementService');
    const auditLog = await trialManagementService.getAuditLog(
      filters,
      limit ? parseInt(limit as string) : 100,
    );

    res.json({
      success: true,
      data: auditLog,
    });
  } catch (err) {
    logger.error('Error getting trial audit log:', err);
    res.status(500).json({
      success: false,
      message: 'Server error getting audit log',
    });
  }
};

// Get expiring trials
export const getExpiringTrials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { daysAhead } = req.query;
    const days = daysAhead ? parseInt(daysAhead as string) : 7;

    const { trialManagementService } = await import('../../services/trialManagementService');
    const expiringTrials = await trialManagementService.getExpiringTrials(days);

    res.json({
      success: true,
      data: expiringTrials,
      count: expiringTrials.length,
    });
  } catch (err) {
    logger.error('Error getting expiring trials:', err);
    res.status(500).json({
      success: false,
      message: 'Server error getting expiring trials',
    });
  }
};
