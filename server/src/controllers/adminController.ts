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
import TrialService from '../services/trialService';
import HealthCheckService from '../services/healthCheckService';
import AlertingService from '../services/alertingService';
import { performanceMonitor } from '../utils/performanceMonitor';
import { cache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';
import { BookingStatus } from '../types/modelTypes';
import bookingEvents from '../utils/bookingEvents';
import { revenueService } from '../services/revenueService';
import { PriceCalculationService } from '../services/priceCalculationService';
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

// Alle Users mit ausstehenden Buchungen abrufen
export const getPendingBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Getting pending bookings...');
    
    // Debug: Zuerst alle Vendor-Benutzer anzeigen
    const allVendors = await User.find({ isVendor: true }).select('kontakt.email pendingBooking');
    logger.info('All vendors found:', { count: allVendors.length });
    allVendors.forEach(vendor => {
      logger.debug('Vendor booking status:', { email: vendor.kontakt?.email, hasPendingBooking: !!vendor.pendingBooking, status: vendor.pendingBooking?.status });
    });
    
    const usersWithPendingBookings = await User.find({
      isVendor: true,
      pendingBooking: { $exists: true, $ne: null },
      'pendingBooking.status': 'pending'
    }).select('kontakt adressen pendingBooking createdAt');
    
    logger.info('Users with pending bookings found:', { count: usersWithPendingBookings.length });
    
    // Calculate correct prices for pending bookings using the universal PriceCalculationService
    const pendingBookingsWithCorrectPrices = usersWithPendingBookings.map((user: any) => {
      const packageData = user.pendingBooking?.packageData;
      
      if (packageData) {
        try {
          // Prepare package options for price calculation
          const packageOptions: any[] = [];
          if (packageData.packageCounts && packageData.packageOptions) {
            Object.entries(packageData.packageCounts).forEach(([packageId, count]: [string, any]) => {
              const numCount = Number(count);
              if (numCount > 0) {
                const option = packageData.packageOptions.find((p: any) => p.id === packageId);
                if (option) {
                  packageOptions.push({
                    id: option.id,
                    name: option.name,
                    price: option.price,
                    count: numCount
                  });
                }
              }
            });
          }
          
          // Calculate price using the service
          const priceBreakdown = PriceCalculationService.calculatePrice({
            packageOptions,
            zusatzleistungen: packageData.zusatzleistungen,
            rentalDuration: packageData.rentalDuration || 3,
            provisionRate: packageData.selectedProvisionType === 'premium' ? 7 : 4,
            discount: packageData.discount
          });
          
          // Update packageData with corrected pricing
          const correctedPackageData = {
            ...packageData,
            totalCost: {
              ...packageData.totalCost,
              monthly: priceBreakdown.monthlyTotal,
              packageCosts: priceBreakdown.packageCosts,
              zusatzleistungenCosts: priceBreakdown.zusatzleistungenCosts,
              subtotal: priceBreakdown.subtotal,
              discountAmount: priceBreakdown.discountAmount,
              discount: priceBreakdown.discount / 100 // Convert back to decimal for frontend
            }
          };
          
          return {
            ...user.toObject(),
            pendingBooking: {
              ...user.pendingBooking.toObject(),
              packageData: correctedPackageData
            }
          };
        } catch (calculationError) {
          logger.error('Error calculating price for pending booking:', calculationError);
          // Return original data if calculation fails
          return user.toObject();
        }
      }
      
      return user.toObject();
    });
    
    res.json({
      success: true,
      count: pendingBookingsWithCorrectPrices.length,
      pendingBookings: pendingBookingsWithCorrectPrices
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen der ausstehenden Buchungen:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der ausstehenden Buchungen' 
    });
  }
};

// Verfügbare Mietfächer für eine Buchung abrufen
export const getAvailableMietfaecher = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find truly available Mietfächer that can be assigned to bookings
    const availableMietfaecher = await Mietfach.find({
      verfuegbar: true,                    // Must be explicitly available
      zugewiesenAn: { $exists: false },    // Not assigned to any user
      aktuellerVertrag: { $exists: false } // No active contract
    }).select('bezeichnung typ beschreibung groesse preis standort features');
    
    logger.info('Found available Mietfächer for booking assignment:', { count: availableMietfaecher.length });
    
    res.json({
      success: true,
      mietfaecher: availableMietfaecher
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen der verfügbaren Mietfächer:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Mietfächer' 
    });
  }
};

// Eine ausstehende Buchung bestätigen mit Mietfach-Zuordnung
export const confirmPendingBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { assignedMietfaecher, priceAdjustments, scheduledStartDate, zusatzleistungenData } = req.body; // Array von Mietfach-IDs und optionale Preisanpassungen
    
    logger.info('confirmPendingBooking called with:', { userId, assignedMietfaecher, priceAdjustments, scheduledStartDate, zusatzleistungenData });
    
    // Import validation utilities
    const { validatePriceAdjustments, validateZusatzleistungen } = require('../utils/validation');
    
    if (!assignedMietfaecher || !Array.isArray(assignedMietfaecher) || assignedMietfaecher.length === 0) {
      logger.warn('Validation failed: assignedMietfaecher invalid', { assignedMietfaecher });
      res.status(400).json({ 
        success: false, 
        message: 'Mindestens ein Mietfach muss zugeordnet werden' 
      });
      return;
    }
    
    // Validate price adjustments
    const priceValidation = validatePriceAdjustments(priceAdjustments, assignedMietfaecher);
    if (!priceValidation.isValid) {
      res.status(400).json({ 
        success: false, 
        message: priceValidation.message 
      });
      return;
    }
    
    const user = await User.findById(userId);
    logger.info('User found:', { 
      userId, 
      userExists: !!user, 
      hasPendingBooking: !!user?.pendingBooking,
      pendingBookingStatus: user?.pendingBooking?.status,
      kontaktStatus: user?.kontakt?.status,
      newsletterConfirmed: user?.kontakt?.newsletterConfirmed
    });
    
    if (!user || !user.pendingBooking || user.pendingBooking.status !== 'pending') {
      res.status(404).json({ 
        success: false, 
        message: 'Keine ausstehende Buchung für diesen User gefunden' 
      });
      return;
    }
    
    // Prüfen ob E-Mail bestätigt wurde - Lockere Validierung für Testing
    if (user.kontakt.status !== 'aktiv' && user.kontakt.status !== 'pending') {
      logger.warn('Email validation failed:', { status: user.kontakt.status, newsletterConfirmed: user.kontakt.newsletterConfirmed });
      res.status(400).json({ 
        success: false, 
        message: `E-Mail-Status ist ${user.kontakt.status}. Benutzer muss E-Mail bestätigen.` 
      });
      return;
    }
    
    // Validate Zusatzleistungen
    const zusatzleistungenValidation = validateZusatzleistungen(
      user.pendingBooking.packageData, 
      zusatzleistungenData
    );
    if (!zusatzleistungenValidation.isValid) {
      res.status(400).json({ 
        success: false, 
        message: zusatzleistungenValidation.message 
      });
      return;
    }
    
    // Prüfen ob alle Mietfächer verfügbar sind
    logger.info('Checking assigned mietfaecher:', { assignedMietfaecher });
    
    // First, let's check what state the requested Mietfächer are in
    const allRequestedMietfaecher = await Mietfach.find({ _id: { $in: assignedMietfaecher } });
    const mietfaecherStatus = allRequestedMietfaecher.map((mf: any) => ({
      id: mf._id.toString(),
      bezeichnung: mf.bezeichnung,
      verfuegbar: mf.verfuegbar,
      zugewiesenAn: mf.zugewiesenAn ? mf.zugewiesenAn.toString() : null,
      aktuellerVertrag: mf.aktuellerVertrag ? mf.aktuellerVertrag.toString() : null
    }));
    logger.info('All requested Mietfaecher status:', { mietfaecher: mietfaecherStatus });
    
    // Now check which ones are actually available
    const mietfaecher = await Mietfach.find({
      _id: { $in: assignedMietfaecher },
      verfuegbar: true,
      zugewiesenAn: { $exists: false }
    });
    
    logger.info('Available mietfaecher found:', { 
      requested: assignedMietfaecher.length, 
      found: mietfaecher.length,
      foundIds: mietfaecher.map(m => (m._id as any).toString())
    });
    
    if (mietfaecher.length !== assignedMietfaecher.length) {
      // Provide more detailed error message
      const unavailableIds = assignedMietfaecher.filter(id => 
        !mietfaecher.some((mf: any) => mf._id.toString() === id)
      );
      
      const unavailableDetails = allRequestedMietfaecher.filter((mf: any) => 
        unavailableIds.includes(mf._id.toString())
      ).map((mf: any) => ({
        id: mf._id.toString(),
        bezeichnung: mf.bezeichnung,
        reason: !mf.verfuegbar ? 'nicht verfügbar' : mf.zugewiesenAn ? 'bereits zugewiesen' : 'unbekannt'
      }));
      
      logger.warn('Unavailable Mietfächer details:', { unavailableDetails });
      
      res.status(400).json({ 
        success: false, 
        message: `${mietfaecher.length} von ${assignedMietfaecher.length} Mietfächern sind verfügbar`,
        unavailableDetails: unavailableDetails
      });
      return;
    }
    
    // Vertrag aus pendingBooking-Daten erstellen
    const { createVertragFromPendingBooking } = require('./vertragController');
    
    logger.info('Starting contract creation...');
    const vertragData = await Promise.race([
      createVertragFromPendingBooking(
        userId, 
        user.pendingBooking.packageData, 
        assignedMietfaecher, 
        priceValidation.validAdjustments,
        scheduledStartDate ? new Date(scheduledStartDate) : new Date(),
        zusatzleistungenValidation
      ),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Contract creation timeout after 10 seconds')), 10000)
      )
    ]);
    logger.info('Contract creation completed:', { success: vertragData.success });
    
    if (!vertragData.success) {
      res.status(500).json({ 
        success: false, 
        message: vertragData.message || 'Fehler beim Erstellen des Vertrags' 
      });
      return;
    }
    
    // Mietfächer dem User zuweisen
    await Mietfach.updateMany(
      { _id: { $in: assignedMietfaecher } },
      { 
        zugewiesenAn: userId,
        verfuegbar: false,
        aktuellerVertrag: vertragData.vertragId
      }
    );
    
    // E-Mail via Queue system senden (enhanced booking confirmation)
    const emailQueue = require('../utils/emailQueue').default;
    
    // Prepare enhanced email data with complete assignment details
    const mietfachDetails = mietfaecher.map((mf: any) => {
      const mietfachId = mf._id ? mf._id.toString() : '';
      const adjustedPrice = priceValidation.validAdjustments && priceValidation.validAdjustments[mietfachId] 
        ? priceValidation.validAdjustments[mietfachId] 
        : (mf.preis || 0);
      
      return {
        _id: mietfachId,
        bezeichnung: mf.bezeichnung,
        typ: mf.typ,
        standort: mf.standort,
        beschreibung: mf.beschreibung,
        adjustedPrice: adjustedPrice
      };
    });
    
    // Send email directly (bypassing queue temporarily due to Redis issues)
    logger.info('Sending booking confirmation email directly...');
    let emailJobId = 'direct-email-' + Date.now();
    
    try {
      const { sendAdminConfirmationEmail } = require('../utils/emailService');
      
      // Verwende das richtige Template mit allen Mietfach-Details
      await sendAdminConfirmationEmail({
        vendorName: user.kontakt.name,
        email: user.kontakt.email,
        mietfaecher: mietfachDetails.map(mf => ({
          _id: mf._id,
          bezeichnung: mf.bezeichnung,
          typ: mf.typ,
          preis: mf.adjustedPrice,
          standort: mf.standort,
          beschreibung: mf.beschreibung
        })),
        vertrag: { _id: vertragData.vertragId },
        packageData: {
          ...user.pendingBooking.packageData,
          totalCost: {
            ...user.pendingBooking.packageData.totalCost,
            provision: user.pendingBooking.packageData.totalCost?.provision || 4
          }
        }
      });
      
      logger.info('✅ Admin confirmation email sent successfully with mietfach details');
    } catch (emailError) {
      logger.error('⚠️ Email sending failed, but booking confirmation will continue:', emailError);
      // Don't fail the entire booking process due to email issues
    }
    
    logger.info('📬 Enhanced booking confirmation email queued:', { emailJobId });
    
    // Pending Booking als abgeschlossen markieren
    user.pendingBooking.status = BookingStatus.COMPLETED;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Buchung erfolgreich bestätigt, Vertrag erstellt und E-Mail wird gesendet',
      vertragId: vertragData.vertragId,
      emailJobId: emailJobId,
      scheduledStartDate: scheduledStartDate ? new Date(scheduledStartDate) : new Date()
    });
  } catch (err) {
    logger.error('Fehler beim Bestätigen der Buchung:', err);
    logger.error('Error stack:', (err as Error).stack);
    logger.error('Error details:', {
      message: (err as Error).message,
      name: (err as Error).name,
      requestData: { 
        userId: req.params.userId, 
        assignedMietfaecher: req.body.assignedMietfaecher, 
        priceAdjustments: req.body.priceAdjustments, 
        scheduledStartDate: req.body.scheduledStartDate 
      }
    });
    res.status(500).json({ 
      success: false, 
      message: `Serverfehler: ${(err as Error).message}` 
    });
  }
};

// Eine ausstehende Buchung ablehnen
export const rejectPendingBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user || !user.pendingBooking || user.pendingBooking.status !== 'pending') {
      res.status(404).json({ 
        success: false, 
        message: 'Keine ausstehende Buchung für diesen User gefunden' 
      });
      return;
    }
    
    // Pending Booking als abgelehnt markieren
    user.pendingBooking.status = BookingStatus.COMPLETED;
    await user.save();
    
    // TODO: E-Mail an Vendor senden mit Ablehnungsgrund
    
    res.json({ 
      success: true, 
      message: 'Buchung abgelehnt' 
    });
  } catch (err) {
    logger.error('Fehler beim Ablehnen der Buchung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

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

// Email Queue Monitoring für Admin
export const getEmailQueueStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const emailQueue = require('../utils/emailQueue').default;
    
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
    logger.error('Fehler beim Abrufen der Email Queue Stats:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Email Queue Statistics' 
    });
  }
};

// Email Queue Jobs retry für Admin
export const retryFailedEmailJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const emailQueue = require('../utils/emailQueue').default;
    
    const retriedCount = await emailQueue.retryFailedJobs();
    
    res.json({
      success: true,
      message: `${retriedCount} fehlgeschlagene E-Mail-Jobs wurden erneut versucht`,
      retriedCount
    });
  } catch (err) {
    logger.error('Fehler beim Retry der Email Jobs:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Retry der E-Mail-Jobs' 
    });
  }
};

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

// Get launch day monitoring metrics
export const getLaunchDayMetrics = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Error getting launch day metrics:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting launch day metrics' 
    });
  }
};

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

// Get scheduled jobs status
export const getScheduledJobsStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = ScheduledJobs.getJobsStatus();
    
    res.json({
      success: true,
      ...status
    });
  } catch (err) {
    logger.error('Error getting scheduled jobs status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting scheduled jobs status' 
    });
  }
};

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

export const getComponentHealth = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Error getting component health:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting component health' 
    });
  }
};

// Performance Monitoring Endpoints
export const getPerformanceMetrics = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Error getting performance metrics:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting performance metrics' 
    });
  }
};

export const getDetailedMetrics = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Error getting detailed metrics:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting detailed metrics' 
    });
  }
};

export const getEndpointMetrics = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Error getting endpoint metrics:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting endpoint metrics' 
    });
  }
};

// Alerting System Endpoints
export const getActiveAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeAlerts = AlertingService.getActiveAlerts();
    const alertStats = AlertingService.getAlertStatistics();
    
    res.json({
      success: true,
      alerts: {
        active: activeAlerts,
        statistics: alertStats
      }
    });
  } catch (err) {
    logger.error('Error getting active alerts:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting active alerts' 
    });
  }
};

export const getAlertHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, severity } = req.query;
    const limitNum = parseInt(limit as string) || 50;
    
    let alerts;
    if (severity && ['warning', 'critical', 'emergency'].includes(severity as string)) {
      alerts = AlertingService.getAlertsBySeverity(severity as 'warning' | 'critical' | 'emergency');
    } else {
      alerts = AlertingService.getAlertHistory(limitNum);
    }
    
    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (err) {
    logger.error('Error getting alert history:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting alert history' 
    });
  }
};

export const resolveAlert = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Error resolving alert:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error resolving alert' 
    });
  }
};

export const sendTestAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const success = await AlertingService.sendTestAlert();
    
    res.json({
      success,
      message: success ? 'Test alert sent successfully' : 'Failed to send test alert'
    });
  } catch (err) {
    logger.error('Error sending test alert:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error sending test alert' 
    });
  }
};

// Monitoring Configuration Endpoints
export const getMonitoringSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await Settings.getSettings();
    const monitoringConfig = settings.getMonitoringConfig();
    
    res.json({
      success: true,
      monitoring: monitoringConfig
    });
  } catch (err) {
    logger.error('Error getting monitoring settings:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting monitoring settings' 
    });
  }
};

export const updateMonitoringSettings = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Error updating monitoring settings:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating monitoring settings' 
    });
  }
};

// Real-time Monitoring Dashboard Data

// Get trial monitoring dashboard
export const getTrialMonitoringDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialMonitoringService } = await import('../services/trialMonitoringService');
    const dashboard = await trialMonitoringService.getTrialDashboard();
    
    res.json({
      success: true,
      dashboard
    });
  } catch (err) {
    logger.error('Error getting trial monitoring dashboard:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting trial monitoring dashboard' 
    });
  }
};

// Get trial metrics
export const getTrialMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trialMonitoringService } = await import('../services/trialMonitoringService');
    const metrics = await trialMonitoringService.getTrialMetrics();
    
    res.json({
      success: true,
      metrics
    });
  } catch (err) {
    logger.error('Error getting trial metrics:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting trial metrics' 
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

// Get feature flags
export const getFeatureFlags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { featureFlagService } = await import('../services/featureFlagService');
    const featureFlags = await featureFlagService.getAllFeatureFlags();
    
    res.json({
      success: true,
      data: featureFlags
    });
  } catch (err) {
    logger.error('Error getting feature flags:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting feature flags' 
    });
  }
};

// Update feature flags
export const updateFeatureFlags = async (req: Request, res: Response): Promise<void> => {
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

    const { featureFlagService } = await import('../services/featureFlagService');
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
    logger.error('Error updating feature flags:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating feature flags' 
    });
  }
};

// Set trial automation rollout
export const setTrialAutomationRollout = async (req: Request, res: Response): Promise<void> => {
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

    const { featureFlagService } = await import('../services/featureFlagService');
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
    logger.error('Error setting trial automation rollout:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error setting rollout' 
    });
  }
};

// Get trial automation status
export const getTrialAutomationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { featureFlagService } = await import('../services/featureFlagService');
    const status = await featureFlagService.getTrialAutomationStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (err) {
    logger.error('Error getting trial automation status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting automation status' 
    });
  }
};

export const confirmPendingBookingWithSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { mietfachId, startDate, priceAdjustments } = req.body;
    
    logger.info(`Confirming pending booking for user ${userId} with mietfach ${mietfachId}`);
    
    // Get the user with pending booking
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }
    
    if (!user.pendingBooking) {
      res.status(404).json({ 
        success: false, 
        message: 'No pending booking found for this user' 
      });
      return;
    }
    
    const bookingId = (user.pendingBooking as any)._id;
    
    // Update pending booking status and create contract
    user.pendingBooking.status = BookingStatus.CONFIRMED;
      user.pendingBooking.scheduledStartDate = startDate;
      user.pendingBooking.confirmedAt = new Date();
      
      // Get user's provision rate (default to 7% Premium for now, should be from user.provisionssatz)
      const userProvisionssatz = (user as any).provisionssatz || 7;
      
      // Calculate price details
      const rentalDuration = user.pendingBooking.packageData?.rentalDuration || 6;
      const monthlyPrice = priceAdjustments?.[mietfachId] || user.pendingBooking.packageData?.totalCost?.monthly || 40;
      const discount = rentalDuration >= 6 ? 0.05 : 0; // 5% discount for 6+ months
      const finalMonthlyPrice = monthlyPrice * (1 - discount);
      
      // Create the contract
      const contractData = {
        user: userId,
        scheduledStartDate: startDate,
        status: 'scheduled' as const,
        totalMonthlyPrice: finalMonthlyPrice,
        contractDuration: rentalDuration,
        discount: discount,
        provisionssatz: userProvisionssatz,
        istProbemonatBuchung: true, // Assume all new bookings are trial bookings
        probemonatUserId: userId,
        zahlungspflichtigAb: (() => {
          const paymentStart = new Date(startDate);
          paymentStart.setMonth(paymentStart.getMonth() + 1); // Payment starts after trial month
          return paymentStart;
        })(),
        services: mietfachId ? [{
          mietfach: mietfachId,
          monatspreis: monthlyPrice, // Store original price
          mietbeginn: startDate,
          mietende: (() => {
            const end = new Date(startDate);
            end.setMonth(end.getMonth() + rentalDuration + 1); // +1 for trial month
            return end;
          })()
        }] : []
      };
      
      const contract = new Vertrag(contractData);
      await contract.save();
      
      await user.save();
      
      // Emit booking status change event
      bookingEvents.emitStatusChange({
        userId,
        bookingId: bookingId,
        status: BookingStatus.CONFIRMED,
        mietfach: mietfachId ? { id: mietfachId } : null,
        timestamp: new Date()
      });
      
      logger.info('Booking confirmed for user:', { userId, contractId: contract._id });
      
      res.json({
        success: true,
        message: 'Booking confirmed with schedule successfully',
        booking: {
          id: bookingId,
          status: 'confirmed',
          scheduledStartDate: startDate,
          mietfach: mietfachId ? { id: mietfachId } : null,
          contract: { id: contract._id }
        },
        emailQueued: true
      });
      
  } catch (error) {
    logger.error('Error confirming booking with schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Bestätigen der Buchung'
    });
  }
};

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
    
    var trends = { monthlyTrends };
    var finalTotalRevenue = totalRevenue;
    var finalMonthlyAverage = monthlyAverage;
    
    // Get revenue statistics
    const statistics = await revenueService.getRevenueStatistics();
    
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
    const ScheduledJobs = (await import('../services/scheduledJobs')).default;
    
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

// ===============================================
// ZUSATZLEISTUNGEN MANAGEMENT (M013) - Updated Implementation
// ===============================================

// Get contracts with Zusatzleistungen for admin overview
export const getContractsWithZusatzleistungen = async (req: Request, res: Response): Promise<void> => {
  try {
    const { service_type, status } = req.query;
    
    const query: any = {
      $or: [
        { 'zusatzleistungen.lagerservice': true },
        { 'zusatzleistungen.versandservice': true }
      ]
    };

    // Filter by service type
    if (service_type === 'lager') {
      query['zusatzleistungen.lagerservice'] = true;
    } else if (service_type === 'versand') {
      query['zusatzleistungen.versandservice'] = true;
    }

    // Filter by status  
    if (status === 'active') {
      query['zusatzleistungen.lagerservice_bestätigt'] = { $ne: null };
    } else if (status === 'inactive') {
      query['zusatzleistungen.lagerservice_bestätigt'] = null;
    }

    const contracts = await Vertrag.find(query)
      .populate('user', 'username kontakt.name kontakt.email')
      .populate('services.mietfach', 'bezeichnung typ beschreibung standort')
      .sort({ createdAt: -1 });

    // Get package tracking for each contract
    const PackageTracking = require('../models/PackageTracking').default;
    const contractsWithTracking = await Promise.all(
      contracts.map(async (contract) => {
        const packages = await PackageTracking.find({ vertrag_id: contract._id });
        return {
          ...contract.toObject(),
          packages
        };
      })
    );

    res.json({
      success: true,
      count: contractsWithTracking.length,
      contracts: contractsWithTracking
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Zusatzleistungen-Verträge:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Abrufen der Zusatzleistungen-Verträge'
    });
  }
};

// Confirm package arrival (Admin endpoint)
export const confirmPackageArrival = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { package_typ, notizen } = req.body;
    const adminId = (req as any).user?._id;

    // Validate input
    if (!package_typ || !['lagerservice', 'versandservice'].includes(package_typ)) {
      res.status(400).json({
        success: false,
        error: 'Gültiger package_typ ist erforderlich (lagerservice oder versandservice)'
      });
      return;
    }

    // Find contract
    const vertrag = await Vertrag.findById(id);
    if (!vertrag) {
      res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
      return;
    }

    // Check if the service is actually booked
    if (!vertrag.zusatzleistungen?.[package_typ as keyof typeof vertrag.zusatzleistungen]) {
      res.status(400).json({
        success: false,
        error: `${package_typ} ist für diesen Vertrag nicht gebucht`
      });
      return;
    }

    // Find or create package tracking
    const PackageTracking = require('../models/PackageTracking').default;
    let packageTracking = await PackageTracking.findOne({
      vertrag_id: id,
      package_typ: package_typ
    });

    if (!packageTracking) {
      packageTracking = new PackageTracking({
        vertrag_id: id,
        package_typ: package_typ,
        status: 'angekommen',
        ankunft_datum: new Date(),
        bestätigt_von: adminId,
        notizen: notizen
      });
    } else {
      packageTracking.status = 'angekommen';
      packageTracking.ankunft_datum = new Date();
      packageTracking.bestätigt_von = adminId;
      if (notizen) packageTracking.notizen = notizen;
    }

    await packageTracking.save();

    // If it's lagerservice, also update the contract
    if (package_typ === 'lagerservice') {
      await Vertrag.findByIdAndUpdate(id, {
        'zusatzleistungen.lagerservice_bestätigt': new Date()
      });
    }

    const updatedPackage = await PackageTracking.findById(packageTracking._id)
      .populate({
        path: 'vertrag_id',
        populate: {
          path: 'user',
          select: 'kontakt.name kontakt.email'
        }
      })
      .populate('bestätigt_von', 'username kontakt.name');

    // Send email notification to vendor
    if (updatedPackage && updatedPackage.vertrag_id?.user?.kontakt?.email) {
      try {
        const { sendPackageArrivalConfirmation } = require('../utils/emailService');
        await sendPackageArrivalConfirmation({
          vendorName: updatedPackage.vertrag_id.user.kontakt.name,
          vendorEmail: updatedPackage.vertrag_id.user.kontakt.email,
          packageType: package_typ,
          packageId: updatedPackage._id.toString(),
          arrivalDate: new Date(),
          notes: notizen
        });
      } catch (emailError) {
        logger.error('Error sending package arrival email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      package: updatedPackage,
      message: 'Package-Ankunft erfolgreich bestätigt'
    });

  } catch (error) {
    logger.error('Fehler beim Bestätigen der Package-Ankunft:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Bestätigen der Package-Ankunft'
    });
  }
};

// Update package to stored status
export const confirmPackageStored = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notizen } = req.body;
    const adminId = (req as any).user?._id;

    // Find contract
    const vertrag = await Vertrag.findById(id);
    if (!vertrag) {
      res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
      return;
    }

    // Find lagerservice package tracking
    const PackageTracking = require('../models/PackageTracking').default;
    const packageTracking = await PackageTracking.findOne({
      vertrag_id: id,
      package_typ: 'lagerservice',
      status: 'angekommen'
    });

    if (!packageTracking) {
      res.status(400).json({
        success: false,
        error: 'Kein angekommenes Lagerservice-Package gefunden'
      });
      return;
    }

    // Update to stored status
    packageTracking.status = 'eingelagert';
    packageTracking.einlagerung_datum = new Date();
    packageTracking.bestätigt_von = adminId;
    if (notizen) packageTracking.notizen = notizen;

    await packageTracking.save();

    // Activate lagerservice in contract
    await Vertrag.findByIdAndUpdate(id, {
      'zusatzleistungen.lagerservice_bestätigt': new Date()
    });

    const updatedPackage = await PackageTracking.findById(packageTracking._id)
      .populate('vertrag_id', 'user')
      .populate('bestätigt_von', 'username kontakt.name');

    res.json({
      success: true,
      package: updatedPackage,
      message: 'Package erfolgreich eingelagert'
    });

  } catch (error) {
    logger.error('Fehler beim Einlagern des Packages:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Einlagern des Packages'
    });
  }
};

// Admin update contract zusatzleistungen
export const adminUpdateZusatzleistungen = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { lagerservice, versandservice, versandservice_aktiv } = req.body;

    // Find contract
    const vertrag = await Vertrag.findById(id);
    if (!vertrag) {
      res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
      return;
    }

    // Prepare updates
    const updates: any = {};
    if (typeof lagerservice === 'boolean') {
      updates['zusatzleistungen.lagerservice'] = lagerservice;
    }
    if (typeof versandservice === 'boolean') {
      updates['zusatzleistungen.versandservice'] = versandservice;
    }
    if (typeof versandservice_aktiv === 'boolean') {
      updates['zusatzleistungen.versandservice_aktiv'] = versandservice_aktiv;
    }

    const updatedVertrag = await Vertrag.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).populate('user', 'username kontakt.name kontakt.email')
     .populate('services.mietfach', 'bezeichnung typ beschreibung standort');

    // Send lagerservice activation notification if lagerservice was activated
    if (typeof lagerservice === 'boolean' && lagerservice && 
        !vertrag.zusatzleistungen?.lagerservice && 
        updatedVertrag?.user && typeof updatedVertrag.user === 'object' && 'kontakt' in updatedVertrag.user) {
      try {
        const user = updatedVertrag.user as any;
        const { sendLagerserviceActivationNotification } = require('../utils/emailService');
        await sendLagerserviceActivationNotification({
          vendorName: user.kontakt.name,
          vendorEmail: user.kontakt.email,
          contractId: (updatedVertrag._id as any).toString(),
          activationDate: new Date(),
          monthlyFee: updatedVertrag.zusatzleistungen_kosten?.lagerservice_monatlich || 20
        });
      } catch (emailError) {
        logger.error('Error sending lagerservice activation email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      vertrag: updatedVertrag,
      message: 'Zusatzleistungen erfolgreich aktualisiert'
    });

  } catch (error) {
    logger.error('Fehler beim Admin-Update der Zusatzleistungen:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Aktualisieren der Zusatzleistungen'
    });
  }
};