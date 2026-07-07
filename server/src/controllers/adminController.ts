/**
 * @file adminController.ts
 * @purpose Admin facade — dashboard, users, store settings, product categories + re-exports from domain modules
 * @created 2025-01-15
 * @modified 2026-03-29
 */

import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';
import mongoose from 'mongoose';
import User from '../models/User';
import Mietfach from '../models/Mietfach';
import Vertrag from '../models/Vertrag';
import Settings from '../models/Settings';
import { cache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';
import logger from '../utils/logger';

// ===== DASHBOARD =====

/**
 * Retrieves comprehensive dashboard overview with system statistics
 */
export const getDashboardOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const overview = await cache.getOrSet(
      CACHE_KEYS.ADMIN_STATS,
      async () => {
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
          recentSubscribers,
        ] = await Promise.all([
          User.countDocuments({
            'kontakt.mailNewsletter': true,
            'kontakt.newsletterConfirmed': true,
          }),
          User.countDocuments({
            'kontakt.mailNewsletter': true,
            'kontakt.newsletterConfirmed': false,
          }),
          User.countDocuments({
            'kontakt.mailNewsletter': true,
            'kontakt.newsletterConfirmed': true,
            'kontakt.newslettertype': 'customer',
          }),
          User.countDocuments({
            'kontakt.mailNewsletter': true,
            'kontakt.newsletterConfirmed': true,
            'kontakt.newslettertype': 'vendor',
          }),
          Mietfach.countDocuments(),
          Vertrag.countDocuments(),
          User.countDocuments({
            isVendor: true,
            pendingBooking: { $exists: true, $ne: null },
            'pendingBooking.status': 'pending',
          }),
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
            'kontakt.newsletterConfirmed': true,
          })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('kontakt createdAt'),
        ]);

        return {
          newsletter: {
            total: newsletterCount,
            pending: pendingCount,
            customer: customerCount,
            vendor: vendorCount,
          },
          mietfaecher: mietfachCount,
          vertraege: vertragCount,
          pendingBookings: pendingBookingsCount,
          vendorContest: {
            total: vendorContestCount,
            unread: unreadContestCount,
          },
          recentSubscribers,
        };
      },
      CACHE_TTL.SHORT,
    );

    res.json({
      success: true,
      overview,
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der Dashboard-Übersicht', 500, err));
  }
};

// ===== USER MANAGEMENT =====

export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await User.find({})
      .select(
        'username kontakt isAdmin isVendor isFullAccount pendingBooking registrationStatus isPubliclyVisible createdAt',
      )
      .sort({ createdAt: -1 });

    const formattedUsers = users.map((user) => ({
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
      createdAt: user.createdAt,
    }));

    res.json({
      success: true,
      users: formattedUsers,
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der User', 500, err));
  }
};

// ===== STORE SETTINGS =====

export const getStoreOpeningSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        modifiedBy: settings.storeOpening.modifiedBy,
      },
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der Store Opening Settings', 500, err));
  }
};

export const updateStoreOpeningSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { openingDate, openingTime, enabled } = req.body;
    const modifiedBy = (req as any).user?.email || (req as any).user?.id || 'admin';

    if (openingDate) {
      const date = new Date(openingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (date < today) {
        res.status(400).json({
          success: false,
          message: 'Das Eröffnungsdatum darf nicht in der Vergangenheit liegen',
        });
        return;
      }
    }

    if (openingTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(openingTime)) {
      res.status(400).json({
        success: false,
        message: 'Die Uhrzeit muss im Format HH:MM (24-Stunden) angegeben werden',
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
      openingTime !== undefined ? openingTime : oldTime,
    );

    const newDate = openingDate ? new Date(openingDate) : null;
    const hasDateChanged =
      (oldDate === null && newDate !== null) ||
      (oldDate !== null && newDate === null) ||
      (oldDate !== null && newDate !== null && oldDate.getTime() !== newDate.getTime());

    if (hasDateChanged && newDate) {
      const vendors = await User.find({
        isVendor: true,
        'pendingBooking.status': 'pending',
      });

      const { sendOpeningDateChangeNotification } = require('../utils/emailService');
      vendors.forEach((vendor) => {
        sendOpeningDateChangeNotification(vendor.kontakt.email, {
          name: vendor.kontakt.name,
          newDate: newDate,
          oldDate: oldDate,
        }).catch((err: any) => {
          logger.error('Fehler beim Senden der E-Mail an:', {
            email: vendor.kontakt.email,
            error: err,
          });
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
        isStoreOpen: settings.isStoreOpen(),
      },
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Aktualisieren der Store Opening Settings', 500, err));
  }
};

// ===== PRODUCT CATEGORY MANAGEMENT =====

/**
 * Assign FlourIO category tag to products (bulk operation)
 */
export const assignCategoryToProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productIds, categoryTagId } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'productIds array is required',
      });
      return;
    }

    if (!categoryTagId || typeof categoryTagId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'categoryTagId is required',
      });
      return;
    }

    const Tag = mongoose.model('Tag');
    const categoryTag = await Tag.findById(categoryTagId);

    if (!categoryTag) {
      res.status(404).json({
        success: false,
        error: 'Category tag not found',
      });
      return;
    }

    if (!categoryTag.flourioId) {
      res.status(400).json({
        success: false,
        error: 'Selected tag is not a FlourIO category tag',
      });
      return;
    }

    const Product = mongoose.model('Product');
    const updatePromises = productIds.map(async (productId) => {
      try {
        const product = await Product.findById(productId);

        if (!product) {
          logger.warn(`Product not found: ${productId}`);
          return { success: false, productId, error: 'Product not found' };
        }

        const hasTag = product.tags.some(
          (tagId: mongoose.Types.ObjectId) => tagId.toString() === categoryTagId,
        );

        if (hasTag) {
          return { success: true, productId, alreadyHad: true };
        }

        product.tags.push(new mongoose.Types.ObjectId(categoryTagId));
        await product.save();

        return { success: true, productId, alreadyHad: false };
      } catch (error) {
        logger.error(`Error updating product ${productId}:`, error);
        return { success: false, productId, error: 'Update failed' };
      }
    });

    const results = await Promise.all(updatePromises);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const alreadyHadTag = results.filter((r) => r.success && r.alreadyHad).length;
    const newlyAssigned = results.filter((r) => r.success && !r.alreadyHad).length;

    logger.info('Bulk category assignment completed:', {
      total: productIds.length,
      successful,
      failed,
      newlyAssigned,
      alreadyHadTag,
      categoryTagId,
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
          flourioId: categoryTag.flourioId,
        },
      },
      message: `Successfully assigned category to ${newlyAssigned} products (${alreadyHadTag} already had the tag)`,
    });
  } catch (error) {
    next(new AppError('Internal server error during category assignment', 500, error));
  }
};

// ===== RE-EXPORTS FROM DOMAIN MODULES =====

// Booking management
export {
  getPendingBookings,
  getAvailableMietfaecher,
  confirmPendingBooking,
  rejectPendingBooking,
  checkMietfachAvailability,
  confirmPendingBookingWithSchedule,
  getContractsWithZusatzleistungen,
  confirmPackageArrival,
  confirmPackageStored,
  adminUpdateZusatzleistungen,
} from './admin/bookingAdminController';

// Monitoring, health, performance, alerting, feature flags
export {
  getEmailQueueStats,
  retryFailedEmailJobs,
  getLaunchDayMetrics,
  getScheduledJobsStatus,
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
  getTrialMetrics,
  getFeatureFlags,
  updateFeatureFlags,
  setTrialAutomationRollout,
  getTrialAutomationStatus,
} from './admin/monitoringAdminController';

// Trial lifecycle management
export {
  getTrialStatistics,
  triggerTrialActivation,
  triggerTrialStatusUpdate,
  activateVendorTrial,
  extendVendorTrial,
  bulkUpdateTrials,
  getTrialAuditLog,
  getExpiringTrials,
} from './admin/trialAdminController';

// Invoice management
export {
  getInvoiceStats,
  bulkGenerateInvoices,
  editInvoice,
  resendInvoiceEmail,
  cancelInvoice,
} from './admin/invoiceAdminController';

// Vendor oversight (newsletter, visibility, verification)
export {
  getNewsletterSubscribers,
  getNewsletterSubscribersByType,
  deleteNewsletterSubscriber,
  toggleVendorVisibility,
  bulkToggleVendorVisibility,
  updateVendorVerification,
} from './admin/vendorAdminController';
