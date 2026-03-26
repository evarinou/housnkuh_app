/**
 * @file Admin controller for the housnkuh marketplace application
 * @description Comprehensive admin management controller with dashboard, user management, bookings, and system monitoring
 * Handles all administrative operations including newsletter management, vendor oversight, booking management, and system health monitoring
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Mietfach from '../models/Mietfach';
import Vertrag from '../models/Vertrag';
import Settings from '../models/Settings';
import ScheduledJobs from '../services/scheduledJobs';
import { cache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';
import logger from '../utils/logger';

/**
 * Retrieves all confirmed newsletter subscribers
 * @description Fetches all users who have subscribed to newsletter and confirmed their subscription
 * @param req - Express request object
 * @param res - Express response object with subscriber data
 * @returns Promise<void> - Resolves with subscriber list or error message
 * @complexity O(n) where n is the number of users with newsletter subscription
 */
export const getNewsletterSubscribers = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscribers = await User.find({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true
    }).select('kontakt createdAt updatedAt');
    
    res.json({
      success: true,
      count: subscribers.length,
      subscribers
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen der Newsletter-Abonnenten:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Newsletter-Abonnenten' 
    });
  }
};

/**
 * Retrieves newsletter subscribers filtered by type
 * @description Fetches confirmed newsletter subscribers of a specific type (customer/vendor)
 * @param req - Express request object with type parameter
 * @param res - Express response object with filtered subscriber data
 * @returns Promise<void> - Resolves with filtered subscriber list or error message
 * @complexity O(n) where n is the number of users with specific newsletter type
 */
export const getNewsletterSubscribersByType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    
    const subscribers = await User.find({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true,
      'kontakt.newslettertype': type
    }).select('kontakt createdAt updatedAt');
    
    res.json({
      success: true,
      count: subscribers.length,
      subscribers
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen der Newsletter-Abonnenten nach Typ:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Newsletter-Abonnenten nach Typ' 
    });
  }
};

/**
 * Retrieves comprehensive dashboard overview with system statistics
 * @description Provides admin dashboard with cached statistics including newsletter, vendor, booking, and system metrics
 * @param req - Express request object
 * @param res - Express response object with dashboard overview data
 * @returns Promise<void> - Resolves with comprehensive dashboard statistics or error message
 * @complexity O(k) where k is the number of parallel database queries (cached for 2 minutes)
 */
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    // Use cache for dashboard overview with 2 minute TTL
    const overview = await cache.getOrSet(
      CACHE_KEYS.ADMIN_STATS,
      async () => {
        // Parallel execution of all database queries for better performance
        const [
          newsletterCount,
          pendingCount,
          customerCount,
          vendorCount,
          mietfachCount,
          vertragCount,
          pendingBookingsCount,
          vendorContestCount,
          unreadContestCount,
          recentSubscribers
        ] = await Promise.all([
          User.countDocuments({
            'kontakt.mailNewsletter': true,
            'kontakt.newsletterConfirmed': true
          }),
          User.countDocuments({
            'kontakt.mailNewsletter': true,
            'kontakt.newsletterConfirmed': false
          }),
          User.countDocuments({
            'kontakt.mailNewsletter': true,
            'kontakt.newsletterConfirmed': true,
            'kontakt.newslettertype': 'customer'
          }),
          User.countDocuments({
            'kontakt.mailNewsletter': true,
            'kontakt.newsletterConfirmed': true,
            'kontakt.newslettertype': 'vendor'
          }),
          Mietfach.countDocuments(),
          Vertrag.countDocuments(),
          User.countDocuments({
            isVendor: true,
            pendingBooking: { $exists: true, $ne: null },
            'pendingBooking.status': 'pending'
          }),
          // Vendor Contest Statistiken
          (async () => {
            const VendorContest = require('../models/VendorContest').default;
            return await VendorContest.countDocuments();
          })(),
          (async () => {
            const VendorContest = require('../models/VendorContest').default;
            return await VendorContest.countDocuments({ isRead: false });
          })(),
          User.find({
            'kontakt.mailNewsletter': true,
            'kontakt.newsletterConfirmed': true
          })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('kontakt createdAt')
        ]);

        return {
          newsletter: {
            total: newsletterCount,
            pending: pendingCount,
            customer: customerCount,
            vendor: vendorCount
          },
          mietfaecher: mietfachCount,
          vertraege: vertragCount,
          pendingBookings: pendingBookingsCount,
          vendorContest: {
            total: vendorContestCount,
            unread: unreadContestCount
          },
          recentSubscribers
        };
      },
      CACHE_TTL.SHORT // 1 minute cache for admin stats
    );
    
    res.json({
      success: true,
      overview
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen der Dashboard-Übersicht:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Dashboard-Übersicht' 
    });
  }
};

// Newsletter-Abonnent löschen
export const deleteNewsletterSubscriber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'Abonnent nicht gefunden' 
      });
      return;
    }
    
    // Wenn es ein reiner Newsletter-Abonnent ist, lösche den User
    if (!user.isFullAccount) {
      await User.findByIdAndDelete(id);
    } else {
      // Wenn es ein vollständiger Account ist, deaktiviere nur das Newsletter-Abonnement
      user.kontakt.mailNewsletter = false;
      user.kontakt.newsletterConfirmed = false;
      await user.save();
    }
    
    res.json({
      success: true,
      message: 'Newsletter-Abonnent erfolgreich entfernt'
    });
  } catch (err) {
    logger.error('Fehler beim Löschen des Newsletter-Abonnenten:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Löschen des Newsletter-Abonnenten' 
    });
  }
};

// Booking management functions moved to admin/bookingAdminController.ts
export {
  getPendingBookings,
  getAvailableMietfaecher,
  confirmPendingBooking,
  rejectPendingBooking,
  checkMietfachAvailability
} from './admin/bookingAdminController';

// Alle User abrufen (für Admin-Benutzerverwaltung)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({})
      .select('username kontakt isAdmin isVendor isFullAccount pendingBooking registrationStatus isPubliclyVisible createdAt')
      .sort({ createdAt: -1 });
    
    // Daten für Frontend formatieren
    const formattedUsers = users.map(user => ({
      _id: user._id,
      username: user.username || user.kontakt.email,
      name: user.kontakt.name,
      email: user.kontakt.email,
      isAdmin: user.isAdmin || false,
      isVendor: user.isVendor || false,
      isActive: user.kontakt.status === 'aktiv',
      isPubliclyVisible: user.isPubliclyVisible,
      registrationStatus: user.registrationStatus,
      hasPendingBooking: !!user.pendingBooking && user.pendingBooking.status === 'pending',
      createdAt: user.createdAt
    }));
    
    res.json({
      success: true,
      users: formattedUsers
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen der User:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der User' 
    });
  }
};

// Store Opening Settings abrufen
export const getStoreOpeningSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      settings: {
        enabled: settings.storeOpening.enabled,
        openingDate: settings.storeOpening.openingDate,
        openingTime: settings.storeOpening.openingTime || '00:00',
        reminderDays: settings.storeOpening.reminderDays,
        isStoreOpen: settings.isStoreOpen(),
        lastModified: settings.storeOpening.lastModified,
        modifiedBy: settings.storeOpening.modifiedBy
      }
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen der Store Opening Settings:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Store Opening Settings' 
    });
  }
};

// Email Queue & Monitoring functions moved to admin/monitoringAdminController.ts
export { getEmailQueueStats, retryFailedEmailJobs } from './admin/monitoringAdminController';

// Store Opening Settings aktualisieren
export const updateStoreOpeningSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { openingDate, openingTime, enabled } = req.body;
    const modifiedBy = (req as any).user?.email || (req as any).user?.id || 'admin';
    
    // Validierung: Datum darf nicht in der Vergangenheit liegen
    if (openingDate) {
      const date = new Date(openingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        res.status(400).json({ 
          success: false, 
          message: 'Das Eröffnungsdatum darf nicht in der Vergangenheit liegen' 
        });
        return;
      }
    }

    // Validierung: Zeit im richtigen Format
    if (openingTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(openingTime)) {
      res.status(400).json({ 
        success: false, 
        message: 'Die Uhrzeit muss im Format HH:MM (24-Stunden) angegeben werden' 
      });
      return;
    }
    
    const settings = await Settings.getSettings();
    const oldDate = settings.storeOpening.openingDate;
    const oldTime = settings.storeOpening.openingTime;
    
    await settings.updateStoreOpening(
      openingDate ? new Date(openingDate) : null,
      enabled !== undefined ? enabled : settings.storeOpening.enabled,
      modifiedBy,
      openingTime !== undefined ? openingTime : oldTime
    );
    
    // Wenn sich das Datum geändert hat, sende Benachrichtigungen
    const newDate = openingDate ? new Date(openingDate) : null;
    const hasDateChanged = (oldDate === null && newDate !== null) || 
                          (oldDate !== null && newDate === null) ||
                          (oldDate !== null && newDate !== null && oldDate.getTime() !== newDate.getTime());
    
    if (hasDateChanged && newDate) {
      // Hole alle vorregistrierten Vendors
      const vendors = await User.find({
        isVendor: true,
        'pendingBooking.status': 'pending'
      });
      
      // Sende E-Mail-Benachrichtigungen (async im Hintergrund)
      const { sendOpeningDateChangeNotification } = require('../utils/emailService');
      vendors.forEach(vendor => {
        sendOpeningDateChangeNotification(vendor.kontakt.email, {
          name: vendor.kontakt.name,
          newDate: newDate,
          oldDate: oldDate
        }).catch((err: any) => {
          logger.error('Fehler beim Senden der E-Mail an:', { email: vendor.kontakt.email, error: err });
        });
      });
    }
    
    res.json({
      success: true,
      message: 'Store Opening Settings erfolgreich aktualisiert',
      settings: {
        enabled: settings.storeOpening.enabled,
        openingDate: settings.storeOpening.openingDate,
        openingTime: settings.storeOpening.openingTime || '00:00',
        isStoreOpen: settings.isStoreOpen()
      }
    });
  } catch (err) {
    logger.error('Fehler beim Aktualisieren der Store Opening Settings:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Aktualisieren der Store Opening Settings' 
    });
  }
};

// Trial Management Endpoints (R003, R008)

// Get trial statistics for admin dashboard
export const getTrialStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ScheduledJobs.getTrialStatistics();
    
    if (result.success) {
      res.json({
        success: true,
        statistics: result.statistics,
        timestamp: result.timestamp
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to get trial statistics'
      });
    }
  } catch (err) {
    logger.error('Error getting trial statistics:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting trial statistics' 
    });
  }
};

export { getLaunchDayMetrics } from './admin/monitoringAdminController';

// Toggle vendor public visibility (R004)
export const toggleVendorVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId } = req.params;
    const { isPubliclyVisible } = req.body;
    
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }
    
    if (!vendor.isVendor) {
      res.status(400).json({
        success: false,
        message: 'User ist kein Vendor'
      });
      return;
    }
    
    vendor.isPubliclyVisible = isPubliclyVisible;
    await vendor.save();
    
    res.json({
      success: true,
      message: `Vendor-Sichtbarkeit ${isPubliclyVisible ? 'aktiviert' : 'deaktiviert'}`,
      vendor: {
        id: vendor._id,
        name: vendor.kontakt.name,
        email: vendor.kontakt.email,
        isPubliclyVisible: vendor.isPubliclyVisible,
        registrationStatus: vendor.registrationStatus
      }
    });
  } catch (err) {
    logger.error('Error toggling vendor visibility:', err);
    res.status(500).json({
      success: false,
      message: 'Server error toggling vendor visibility'
    });
  }
};

// Bulk toggle vendor visibility (R004)
export const bulkToggleVendorVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorIds, isPubliclyVisible } = req.body;
    
    if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Vendor IDs array ist erforderlich'
      });
      return;
    }
    
    const result = await User.updateMany(
      { 
        _id: { $in: vendorIds },
        isVendor: true
      },
      { 
        isPubliclyVisible: isPubliclyVisible
      }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} Vendors ${isPubliclyVisible ? 'sichtbar' : 'versteckt'} gemacht`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    logger.error('Error bulk toggling vendor visibility:', err);
    res.status(500).json({
      success: false,
      message: 'Server error bulk toggling vendor visibility'
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
        timestamp: result.timestamp
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Trial activation check failed'
      });
    }
  } catch (err) {
    logger.error('Error triggering trial activation:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error triggering trial activation' 
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
        timestamp: result.timestamp
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Trial status update failed'
      });
    }
  } catch (err) {
    logger.error('Error triggering trial status update:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error triggering trial status update' 
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
        message: 'Vendor ID is required'
      });
      return;
    }
    
    const result = await ScheduledJobs.activateVendorTrial(vendorId);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Trial activated successfully for vendor ${vendorId}`,
        vendorId: result.vendorId,
        timestamp: result.timestamp
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to activate vendor trial'
      });
    }
  } catch (err) {
    logger.error('Error activating vendor trial:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error activating vendor trial' 
    });
  }
};

export { getScheduledJobsStatus } from './admin/monitoringAdminController';

// Update vendor verification status (R007)
export const updateVendorVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId } = req.params;
    const { verifyStatus } = req.body;
    
    if (!vendorId) {
      res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
      return;
    }
    
    if (!['verified', 'pending', 'unverified'].includes(verifyStatus)) {
      res.status(400).json({
        success: false,
        message: 'Invalid verification status'
      });
      return;
    }
    
    const vendor = await User.findById(vendorId);
    if (!vendor || !vendor.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
      return;
    }
    
    // Update vendor verification status
    vendor.vendorProfile = vendor.vendorProfile || {};
    vendor.vendorProfile.verifyStatus = verifyStatus;
    
    await vendor.save();
    
    res.json({
      success: true,
      message: `Vendor verification status updated to ${verifyStatus}`,
      vendorId: vendor._id,
      verifyStatus: verifyStatus
    });
  } catch (err) {
    logger.error('Error updating vendor verification:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating vendor verification' 
    });
  }
};

// Health, Performance, Alerting, Monitoring functions moved to admin/monitoringAdminController.ts
export {
  getSystemHealth,
  getSimpleHealthCheck,
  getComponentHealth,
  getPerformanceMetrics,
  getDetailedMetrics,
  getEndpointMetrics,
  getActiveAlerts,
  getAlertHistory,
  resolveAlert,
  sendTestAlert,
  getMonitoringSettings,
  updateMonitoringSettings,
  getTrialMonitoringDashboard,
  getTrialMetrics
} from './admin/monitoringAdminController';

// Extend vendor trial
export const extendVendorTrial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { extensionDays, reason } = req.body;
    const adminUser = (req as any).user;

    if (!extensionDays || extensionDays <= 0) {
      res.status(400).json({
        success: false,
        message: 'Extension days must be a positive number'
      });
      return;
    }

    const { trialManagementService } = await import('../services/trialManagementService');
    const result = await trialManagementService.extendTrial(
      userId,
      extensionDays,
      adminUser?.kontakt?.email || 'admin',
      reason
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          userId: result.userId,
          username: result.username,
          previousEndDate: result.previousEndDate,
          newEndDate: result.newEndDate
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to extend trial'
      });
    }
  } catch (err) {
    logger.error('Error extending vendor trial:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error extending trial' 
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
        message: 'userIds must be a non-empty array'
      });
      return;
    }

    if (!['extend', 'expire', 'reset_reminders'].includes(action)) {
      res.status(400).json({
        success: false,
        message: 'Action must be one of: extend, expire, reset_reminders'
      });
      return;
    }

    const { trialManagementService } = await import('../services/trialManagementService');
    const result = await trialManagementService.bulkUpdateTrialStatus(
      userIds,
      action,
      adminUser?.kontakt?.email || 'admin',
      { extensionDays, reason }
    );

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      data: result
    });
  } catch (err) {
    logger.error('Error in bulk trial update:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error in bulk update' 
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

    const { trialManagementService } = await import('../services/trialManagementService');
    const auditLog = await trialManagementService.getAuditLog(
      filters,
      limit ? parseInt(limit as string) : 100
    );

    res.json({
      success: true,
      data: auditLog
    });
  } catch (err) {
    logger.error('Error getting trial audit log:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting audit log' 
    });
  }
};

// Get expiring trials
export const getExpiringTrials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { daysAhead } = req.query;
    const days = daysAhead ? parseInt(daysAhead as string) : 7;

    const { trialManagementService } = await import('../services/trialManagementService');
    const expiringTrials = await trialManagementService.getExpiringTrials(days);

    res.json({
      success: true,
      data: expiringTrials,
      count: expiringTrials.length
    });
  } catch (err) {
    logger.error('Error getting expiring trials:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting expiring trials' 
    });
  }
};

// Feature Flags functions moved to admin/monitoringAdminController.ts
export {
  getFeatureFlags,
  updateFeatureFlags,
  setTrialAutomationRollout,
  getTrialAutomationStatus
} from './admin/monitoringAdminController';

// Booking schedule and Zusatzleistungen management functions moved to admin/bookingAdminController.ts
export {
  confirmPendingBookingWithSchedule,
  getContractsWithZusatzleistungen,
  confirmPackageArrival,
  confirmPackageStored,
  adminUpdateZusatzleistungen
} from './admin/bookingAdminController';

// ===== ADMIN INVOICE MANAGEMENT =====

/**
 * Get comprehensive invoice statistics for admin dashboard
 */
export const getInvoiceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const Invoice = (await import('../models/Invoice')).default;
    
    // Basic statistics
    const totalInvoices = await Invoice.countDocuments();
    const paidInvoices = await Invoice.countDocuments({ status: 'paid' });
    const overdueInvoices = await Invoice.countDocuments({ status: 'overdue' });
    const cancelledInvoices = await Invoice.countDocuments({ status: 'cancelled' });
    const draftInvoices = await Invoice.countDocuments({ status: 'draft' });
    const sentInvoices = await Invoice.countDocuments({ status: 'sent' });

    // Revenue statistics
    const totalRevenue = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const monthlyStats = await Invoice.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            status: '$status'
          },
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0] } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Email statistics
    const emailStats = await Invoice.aggregate([
      {
        $group: {
          _id: '$emailStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivity = await Invoice.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const stats = {
      overview: {
        total: totalInvoices,
        paid: paidInvoices,
        overdue: overdueInvoices,
        cancelled: cancelledInvoices,
        draft: draftInvoices,
        sent: sentInvoices
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        monthly: monthlyStats
      },
      email: emailStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      recentActivity
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Fehler beim Abrufen der Invoice-Statistiken:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Abrufen der Invoice-Statistiken'
    });
  }
};

/**
 * Generate invoices for multiple vendors (bulk operation)
 */
export const bulkGenerateInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorIds, period } = req.body;
    
    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Vendor IDs sind erforderlich'
      });
      return;
    }

    if (!period || !period.month || !period.year) {
      res.status(400).json({
        success: false,
        error: 'Period (month/year) ist erforderlich'
      });
      return;
    }

    // Use inline bulk generation instead of external function
    const results: Array<{ vendorId: string; success: boolean; error?: string; invoiceId?: string }> = [];
    
    const invoiceGenerationService = (await import('../services/invoiceGenerationService')).default;
    
    // Process each vendor individually for better error tracking
    for (const vendorId of vendorIds) {
      try {
        const result = await invoiceGenerationService.generateMonthlyInvoice(vendorId, period.month, period.year);
        results.push({
          vendorId,
          success: true,
          invoiceId: result.invoiceId
        });
      } catch (error: any) {
        results.push({
          vendorId,
          success: false,
          error: error.message || 'Unknown error occurred'
        });
      }
    }
    
    await invoiceGenerationService.cleanup();
    
    // Log bulk generation for audit trail
    const auditEntry = {
      action: 'bulk_invoice_generation',
      adminId: (req as any).user?.id,
      vendorIds,
      period,
      results,
      timestamp: new Date()
    };
    
    // TODO: Save to audit log model when implemented
    logger.info('Bulk invoice generation completed:', auditEntry);

    res.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.filter((r: any) => r.success).length,
        failed: results.filter((r: any) => !r.success).length,
        results
      }
    });

  } catch (error) {
    logger.error('Fehler bei der Bulk-Invoice-Generierung:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler bei der Bulk-Invoice-Generierung'
    });
  }
};

/**
 * Edit invoice (limited fields for admin)
 */
export const editInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { dueDate, status, notes } = req.body;
    
    const Invoice = (await import('../models/Invoice')).default;
    
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Invoice nicht gefunden'
      });
      return;
    }

    // Only allow editing certain fields
    const allowedUpdates: any = {};
    if (dueDate) allowedUpdates.dueDate = new Date(dueDate);
    if (status && ['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      allowedUpdates.status = status;
    }
    if (notes) allowedUpdates.notes = notes;
    
    // Set paid date if status changes to paid
    if (status === 'paid' && invoice.status !== 'paid') {
      allowedUpdates.paidDate = new Date();
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      allowedUpdates,
      { new: true, runValidators: true }
    );

    // Log edit for audit trail
    const auditEntry = {
      action: 'invoice_edit',
      adminId: (req as any).user?.id,
      invoiceId: id,
      changes: allowedUpdates,
      timestamp: new Date()
    };
    
    logger.info('Invoice edited by admin:', auditEntry);

    res.json({
      success: true,
      data: updatedInvoice
    });

  } catch (error) {
    logger.error('Fehler beim Bearbeiten der Invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Bearbeiten der Invoice'
    });
  }
};

/**
 * Resend invoice email
 */
export const resendInvoiceEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const Invoice = (await import('../models/Invoice')).default;
    
    const invoice = await Invoice.findById(id).populate('vendor');
    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Invoice nicht gefunden'
      });
      return;
    }

    // Reset email status to retry
    await Invoice.findByIdAndUpdate(id, {
      emailStatus: 'pending',
      emailAttempts: invoice.emailAttempts + 1,
      lastEmailAttempt: new Date()
    });

    // Queue email for sending
    const { emailQueue } = await import('../utils/emailQueue');
    await emailQueue.addInvoiceNotificationEmail({
      userId: (invoice.vendor._id as any).toString(),
      invoiceId: (invoice._id as any).toString(),
      email: (invoice.vendor as any).email,
      vendorId: (invoice.vendor._id as any).toString(),
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      dueDate: invoice.dueDate
    });

    // Log resend for audit trail
    const auditEntry = {
      action: 'invoice_email_resend',
      adminId: (req as any).user?.id,
      invoiceId: id,
      attempt: invoice.emailAttempts + 1,
      timestamp: new Date()
    };
    
    logger.info('Invoice email resent by admin:', auditEntry);

    res.json({
      success: true,
      message: 'Email erfolgreich zur Warteschlange hinzugefügt'
    });

  } catch (error) {
    logger.error('Fehler beim Erneuten Senden der Invoice-Email:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Erneuten Senden der Invoice-Email'
    });
  }
};

/**
 * Cancel invoice (soft delete)
 */
export const cancelInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const Invoice = (await import('../models/Invoice')).default;
    
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Invoice nicht gefunden'
      });
      return;
    }

    if (invoice.status === 'paid') {
      res.status(400).json({
        success: false,
        error: 'Bezahlte Invoices können nicht storniert werden'
      });
      return;
    }

    // Soft delete by setting status to cancelled
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason || 'Storniert durch Admin'
      },
      { new: true }
    );

    // Log cancellation for audit trail
    const auditEntry = {
      action: 'invoice_cancellation',
      adminId: (req as any).user?.id,
      invoiceId: id,
      reason: reason || 'Storniert durch Admin',
      timestamp: new Date()
    };
    
    logger.info('Invoice cancelled by admin:', auditEntry);

    res.json({
      success: true,
      data: updatedInvoice
    });

  } catch (error) {
    logger.error('Fehler beim Stornieren der Invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Stornieren der Invoice'
    });
  }
};

/**
 * Assign FlourIO category tag to products
 * @description Bulk assign a category tag to multiple products for FlourIO sync
 * @param req - Express request with body: { productIds: string[], categoryTagId: string }
 * @param res - Express response with assignment results
 * @returns Promise<void> - Resolves with success count or error
 */
export const assignCategoryToProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productIds, categoryTagId } = req.body;

    // Validation
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'productIds array is required'
      });
      return;
    }

    if (!categoryTagId || typeof categoryTagId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'categoryTagId is required'
      });
      return;
    }

    // Verify category tag exists and has flourioId
    const Tag = mongoose.model('Tag');
    const categoryTag = await Tag.findById(categoryTagId);
    
    if (!categoryTag) {
      res.status(404).json({
        success: false,
        error: 'Category tag not found'
      });
      return;
    }

    if (!categoryTag.flourioId) {
      res.status(400).json({
        success: false,
        error: 'Selected tag is not a FlourIO category tag'
      });
      return;
    }

    // Update products: add category tag if not already present
    const Product = mongoose.model('Product');
    const updatePromises = productIds.map(async (productId) => {
      try {
        const product = await Product.findById(productId);
        
        if (!product) {
          logger.warn(`Product not found: ${productId}`);
          return { success: false, productId, error: 'Product not found' };
        }

        // Check if product already has this tag
        const hasTag = product.tags.some((tagId: mongoose.Types.ObjectId) => 
          tagId.toString() === categoryTagId
        );

        if (hasTag) {
          return { success: true, productId, alreadyHad: true };
        }

        // Add tag to product
        product.tags.push(new mongoose.Types.ObjectId(categoryTagId));
        await product.save();

        return { success: true, productId, alreadyHad: false };
      } catch (error) {
        logger.error(`Error updating product ${productId}:`, error);
        return { success: false, productId, error: 'Update failed' };
      }
    });

    const results = await Promise.all(updatePromises);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const alreadyHadTag = results.filter(r => r.success && r.alreadyHad).length;
    const newlyAssigned = results.filter(r => r.success && !r.alreadyHad).length;

    logger.info('Bulk category assignment completed:', {
      total: productIds.length,
      successful,
      failed,
      newlyAssigned,
      alreadyHadTag,
      categoryTagId
    });

    res.json({
      success: true,
      data: {
        total: productIds.length,
        successful,
        failed,
        newlyAssigned,
        alreadyHadTag,
        categoryTag: {
          _id: categoryTag._id,
          name: categoryTag.name,
          flourioId: categoryTag.flourioId
        }
      },
      message: `Successfully assigned category to ${newlyAssigned} products (${alreadyHadTag} already had the tag)`
    });

  } catch (error) {
    logger.error('Error assigning category to products:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during category assignment'
    });
  }
};
