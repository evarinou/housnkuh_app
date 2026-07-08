/**
 * @file monitoringAdminController.ts
 * @purpose Admin controller functions for system health, performance monitoring, alerting, feature flags, and email queue management
 * @created 2026-03-25
 */

import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError';
import User from '../../models/User';
import Settings from '../../models/Settings';
import ScheduledJobs from '../../services/scheduledJobs';
import HealthCheckService from '../../services/healthCheckService';
import AlertingService from '../../services/alertingService';
import { performanceMonitor } from '../../utils/performanceMonitor';
import logger from '../../utils/logger';
import emailQueue from '../../utils/emailQueue';

// =====================================================
// Domain 6: Email Queue
// =====================================================

// Email Queue Monitoring für Admin
export const getEmailQueueStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get queue statistics
    const stats = await emailQueue.getStats();
    const recentJobs = await emailQueue.getRecentJobs(20);
    const isHealthy = await emailQueue.isHealthy();

    // Format recent jobs for frontend
    const formattedJobs = recentJobs.map((job: any) => ({
      id: job.id,
      name: job.name,
      data: {
        email: job.data.email,
        userId: job.data.userId,
        type: job.data.type
      },
      opts: job.opts,
      progress: job.progress(),
      delay: job.delay,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade
    }));

    res.json({
      success: true,
      emailQueue: {
        stats,
        isHealthy,
        recentJobs: formattedJobs
      }
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der Email Queue Statistics', 500, err));
  }
};

// Email Queue Jobs retry für Admin
export const retryFailedEmailJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const retriedCount = await emailQueue.retryFailedJobs();

    res.json({
      success: true,
      message: `${retriedCount} fehlgeschlagene E-Mail-Jobs wurden erneut versucht`,
      retriedCount
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Retry der E-Mail-Jobs', 500, err));
  }
};

// =====================================================
// Domain 9: System Health
// =====================================================

// Get launch day monitoring metrics
export const getLaunchDayMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await Settings.getSettings();
    const now = new Date();

    // Calculate time until launch
    let timeUntilLaunch = null;
    let isLaunchDay = false;
    let launchStatus = 'not_configured';

    if (settings.storeOpening.enabled && settings.storeOpening.openingDate) {
      const openingDate = new Date(settings.storeOpening.openingDate);
      if (settings.storeOpening.openingTime) {
        const [hours, minutes] = settings.storeOpening.openingTime.split(':').map(Number);
        openingDate.setHours(hours, minutes, 0, 0);
      }

      const timeDiff = openingDate.getTime() - now.getTime();

      if (timeDiff > 0) {
        timeUntilLaunch = {
          days: Math.floor(timeDiff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((timeDiff % (1000 * 60)) / 1000),
          totalMilliseconds: timeDiff
        };
        launchStatus = 'scheduled';
      } else {
        // Launch has occurred
        const hoursSinceLaunch = Math.abs(timeDiff) / (1000 * 60 * 60);
        isLaunchDay = hoursSinceLaunch < 24;
        launchStatus = 'launched';
      }
    }

    // Get vendor statistics
    const [
      preregisteredCount,
      activeTrialCount,
      expiredTrialCount,
      totalVendorCount,
      recentActivations
    ] = await Promise.all([
      User.countDocuments({ isVendor: true, registrationStatus: 'preregistered' }),
      User.countDocuments({ isVendor: true, registrationStatus: 'trial_active' }),
      User.countDocuments({ isVendor: true, registrationStatus: 'trial_expired' }),
      User.countDocuments({ isVendor: true }),
      User.find({
        isVendor: true,
        registrationStatus: 'trial_active',
        trialStartDate: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }).select('kontakt.name kontakt.email trialStartDate').limit(10).sort('-trialStartDate')
    ]);

    // Get job status
    const jobsStatus = ScheduledJobs.getJobsStatus();

    // Compile metrics
    const metrics = {
      launchConfiguration: {
        enabled: settings.storeOpening.enabled,
        openingDate: settings.storeOpening.openingDate,
        openingTime: settings.storeOpening.openingTime,
        isStoreOpen: settings.isStoreOpen(),
        launchStatus,
        isLaunchDay,
        timeUntilLaunch
      },
      vendorStatistics: {
        preregistered: preregisteredCount,
        activeTrials: activeTrialCount,
        expiredTrials: expiredTrialCount,
        totalVendors: totalVendorCount,
        readyForActivation: preregisteredCount,
        activationRate: totalVendorCount > 0 ? Math.round((activeTrialCount / totalVendorCount) * 100) : 0
      },
      recentActivations: recentActivations.map(v => ({
        name: v.kontakt.name,
        email: v.kontakt.email,
        activatedAt: v.trialStartDate
      })),
      systemStatus: {
        scheduledJobs: jobsStatus,
        nextActivationCheck: new Date(now.getTime() + (5 * 60 * 1000)), // Next check in 5 minutes
        serverTime: now,
        timezone: 'Europe/Berlin'
      }
    };

    res.json({
      success: true,
      metrics,
      timestamp: new Date()
    });

  } catch (err) {
    next(new AppError('Server error getting launch day metrics', 500, err));
  }
};

// Get scheduled jobs status
export const getScheduledJobsStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = ScheduledJobs.getJobsStatus();

    res.json({
      success: true,
      ...status
    });
  } catch (err) {
    next(new AppError('Server error getting scheduled jobs status', 500, err));
  }
};

// Health Check Endpoints
export const getSystemHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthStatus = await HealthCheckService.performHealthCheck();

    res.json({
      success: true,
      health: healthStatus
    });
  } catch (err) {
    logger.error('Error getting system health:', err);
    res.status(500).json({
      success: false,
      message: 'Server error getting system health',
      health: {
        overall: 'unhealthy',
        components: [],
        timestamp: new Date(),
        uptime: process.uptime()
      }
    });
  }
};

export const getSimpleHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const simpleStatus = await HealthCheckService.getSimpleStatus();

    res.json({
      success: true,
      ...simpleStatus
    });
  } catch (err) {
    logger.error('Error in simple health check:', err);
    res.status(500).json({
      success: false,
      status: 'error',
      timestamp: new Date()
    });
  }
};

export const getComponentHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { component } = req.params;

    if (!component) {
      res.status(400).json({
        success: false,
        message: 'Component name is required'
      });
      return;
    }

    const componentHealth = await HealthCheckService.checkComponent(component);

    if (!componentHealth) {
      res.status(404).json({
        success: false,
        message: 'Component not found'
      });
      return;
    }

    res.json({
      success: true,
      component: componentHealth
    });
  } catch (err) {
    next(new AppError('Server error getting component health', 500, err));
  }
};

// =====================================================
// Domain 10: Performance Monitoring
// =====================================================

// Performance Monitoring Endpoints
export const getPerformanceMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const summary = performanceMonitor.getPerformanceSummary();
    const thresholds = performanceMonitor.checkPerformanceThresholds();

    res.json({
      success: true,
      performance: {
        summary,
        thresholds,
        timestamp: new Date()
      }
    });
  } catch (err) {
    next(new AppError('Server error getting performance metrics', 500, err));
  }
};

export const getDetailedMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, limit } = req.query;
    const limitNum = parseInt(limit as string) || 100;

    let metrics;
    if (type === 'requests') {
      metrics = performanceMonitor.getRequestMetrics(limitNum);
    } else if (type === 'database') {
      metrics = performanceMonitor.getDatabaseMetrics(limitNum);
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid metrics type. Use "requests" or "database"'
      });
      return;
    }

    res.json({
      success: true,
      type,
      metrics,
      count: metrics.length
    });
  } catch (err) {
    next(new AppError('Server error getting detailed metrics', 500, err));
  }
};

export const getEndpointMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { path } = req.params;

    if (!path) {
      res.status(400).json({
        success: false,
        message: 'Endpoint path is required'
      });
      return;
    }

    const decodedPath = decodeURIComponent(path);
    const metrics = performanceMonitor.getEndpointMetrics(decodedPath);

    res.json({
      success: true,
      path: decodedPath,
      metrics
    });
  } catch (err) {
    next(new AppError('Server error getting endpoint metrics', 500, err));
  }
};

// =====================================================
// Domain 11: Alerting System
// =====================================================

// Alerting System Endpoints
export const getActiveAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeAlerts = await AlertingService.getActiveAlerts();
    const alertStats = await AlertingService.getAlertStatistics();

    res.json({
      success: true,
      alerts: {
        active: activeAlerts,
        statistics: alertStats
      }
    });
  } catch (err) {
    next(new AppError('Server error getting active alerts', 500, err));
  }
};;;

export const getAlertHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit, severity } = req.query;
    const limitNum = parseInt(limit as string) || 50;

    let alerts;
    if (severity && ['warning', 'critical', 'emergency'].includes(severity as string)) {
      alerts = await AlertingService.getAlertsBySeverity(severity as 'warning' | 'critical' | 'emergency');
    } else {
      alerts = await AlertingService.getAlertHistory(limitNum);
    }

    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (err) {
    next(new AppError('Server error getting alert history', 500, err));
  }
};;

export const resolveAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { alertId } = req.params;

    if (!alertId) {
      res.status(400).json({
        success: false,
        message: 'Alert ID is required'
      });
      return;
    }

    const resolved = AlertingService.resolveAlert(alertId);

    if (!resolved) {
      res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      alertId
    });
  } catch (err) {
    next(new AppError('Server error resolving alert', 500, err));
  }
};

export const sendTestAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const success = await AlertingService.sendTestAlert();

    res.json({
      success,
      message: success ? 'Test alert sent successfully' : 'Failed to send test alert'
    });
  } catch (err) {
    next(new AppError('Server error sending test alert', 500, err));
  }
};

// =====================================================
// Domain 12: Monitoring Configuration
// =====================================================

// Monitoring Configuration Endpoints
export const getMonitoringSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await Settings.getSettings();
    const monitoringConfig = settings.getMonitoringConfig();

    res.json({
      success: true,
      monitoring: monitoringConfig
    });
  } catch (err) {
    next(new AppError('Server error getting monitoring settings', 500, err));
  }
};

export const updateMonitoringSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { monitoring } = req.body;
    const adminUser = (req as any).user;

    if (!monitoring) {
      res.status(400).json({
        success: false,
        message: 'Monitoring configuration is required'
      });
      return;
    }

    const settings = await Settings.getSettings();
    await settings.updateMonitoringSettings(monitoring, adminUser?.kontakt?.email);

    res.json({
      success: true,
      message: 'Monitoring settings updated successfully',
      monitoring: settings.getMonitoringConfig()
    });
  } catch (err) {
    next(new AppError('Server error updating monitoring settings', 500, err));
  }
};

// Real-time Monitoring Dashboard Data

// Get trial monitoring dashboard
export const getTrialMonitoringDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { trialMonitoringService } = await import('../../services/trialMonitoringService');
    const dashboard = await trialMonitoringService.getTrialDashboard();

    res.json({
      success: true,
      dashboard
    });
  } catch (err) {
    next(new AppError('Server error getting trial monitoring dashboard', 500, err));
  }
};

// Get trial metrics
export const getTrialMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { trialMonitoringService } = await import('../../services/trialMonitoringService');
    const metrics = await trialMonitoringService.getTrialMetrics();

    res.json({
      success: true,
      metrics
    });
  } catch (err) {
    next(new AppError('Server error getting trial metrics', 500, err));
  }
};

// =====================================================
// Domain 13: Feature Flags
// =====================================================

// Get feature flags
export const getFeatureFlags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { featureFlagService } = await import('../../services/featureFlagService');
    const featureFlags = await featureFlagService.getAllFeatureFlags();

    res.json({
      success: true,
      data: featureFlags
    });
  } catch (err) {
    next(new AppError('Server error getting feature flags', 500, err));
  }
};

// Update feature flags
export const updateFeatureFlags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { featureFlags } = req.body;
    const adminUser = (req as any).user;

    if (!featureFlags) {
      res.status(400).json({
        success: false,
        message: 'Feature flags data is required'
      });
      return;
    }

    const { featureFlagService } = await import('../../services/featureFlagService');
    const updatedSettings = await featureFlagService.updateFeatureFlags(
      featureFlags,
      adminUser?.kontakt?.email || 'admin'
    );

    res.json({
      success: true,
      message: 'Feature flags updated successfully',
      data: updatedSettings.featureFlags
    });
  } catch (err) {
    next(new AppError('Server error updating feature flags', 500, err));
  }
};

// Set trial automation rollout
export const setTrialAutomationRollout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { enabled, rolloutPercentage } = req.body;
    const adminUser = (req as any).user;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'enabled must be a boolean'
      });
      return;
    }

    if (rolloutPercentage !== undefined && (rolloutPercentage < 0 || rolloutPercentage > 100)) {
      res.status(400).json({
        success: false,
        message: 'rolloutPercentage must be between 0 and 100'
      });
      return;
    }

    const { featureFlagService } = await import('../../services/featureFlagService');
    const updatedSettings = await featureFlagService.setTrialAutomationRollout(
      enabled,
      rolloutPercentage || 100,
      adminUser?.kontakt?.email || 'admin'
    );

    res.json({
      success: true,
      message: 'Trial automation rollout updated successfully',
      data: {
        enabled,
        rolloutPercentage: rolloutPercentage || 100,
        settings: updatedSettings.featureFlags
      }
    });
  } catch (err) {
    next(new AppError('Server error setting rollout', 500, err));
  }
};

// Get trial automation status
export const getTrialAutomationStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { featureFlagService } = await import('../../services/featureFlagService');
    const status = await featureFlagService.getTrialAutomationStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (err) {
    next(new AppError('Server error getting automation status', 500, err));
  }
};
