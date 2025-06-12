// server/src/controllers/adminController.ts
import { Request, Response } from 'express';
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

// Alle Newsletter-Abonnenten abrufen
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
    console.error('Fehler beim Abrufen der Newsletter-Abonnenten:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Newsletter-Abonnenten' 
    });
  }
};

// Nach Typ gefilterte Newsletter-Abonnenten abrufen
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
    console.error('Fehler beim Abrufen der Newsletter-Abonnenten nach Typ:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Newsletter-Abonnenten nach Typ' 
    });
  }
};

// Dashboard-Übersicht
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
    console.error('Fehler beim Abrufen der Dashboard-Übersicht:', err);
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
    console.error('Fehler beim Löschen des Newsletter-Abonnenten:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Löschen des Newsletter-Abonnenten' 
    });
  }
};

// Alle Users mit ausstehenden Buchungen abrufen
export const getPendingBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Getting pending bookings...');
    
    // Debug: Zuerst alle Vendor-Benutzer anzeigen
    const allVendors = await User.find({ isVendor: true }).select('kontakt.email pendingBooking');
    console.log('All vendors found:', allVendors.length);
    allVendors.forEach(vendor => {
      console.log(`Vendor: ${vendor.kontakt?.email}, has pendingBooking: ${!!vendor.pendingBooking}, status: ${vendor.pendingBooking?.status}`);
    });
    
    const usersWithPendingBookings = await User.find({
      isVendor: true,
      pendingBooking: { $exists: true, $ne: null },
      'pendingBooking.status': 'pending'
    }).select('kontakt adressen pendingBooking createdAt');
    
    console.log('Users with pending bookings found:', usersWithPendingBookings.length);
    
    res.json({
      success: true,
      count: usersWithPendingBookings.length,
      pendingBookings: usersWithPendingBookings
    });
  } catch (err) {
    console.error('Fehler beim Abrufen der ausstehenden Buchungen:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der ausstehenden Buchungen' 
    });
  }
};

// Verfügbare Mietfächer für eine Buchung abrufen
export const getAvailableMietfaecher = async (req: Request, res: Response): Promise<void> => {
  try {
    const availableMietfaecher = await Mietfach.find({
      verfuegbar: true,
      zugewiesenAn: { $exists: false }
    }).select('bezeichnung typ beschreibung groesse preis standort features');
    
    res.json({
      success: true,
      mietfaecher: availableMietfaecher
    });
  } catch (err) {
    console.error('Fehler beim Abrufen der verfügbaren Mietfächer:', err);
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
    const { assignedMietfaecher, priceAdjustments } = req.body; // Array von Mietfach-IDs und optionale Preisanpassungen
    
    console.log('confirmPendingBooking called with:', { userId, assignedMietfaecher, priceAdjustments });
    
    // Import validation utilities
    const { validatePriceAdjustments } = require('../utils/validation');
    
    if (!assignedMietfaecher || !Array.isArray(assignedMietfaecher) || assignedMietfaecher.length === 0) {
      console.log('Validation failed: assignedMietfaecher invalid', assignedMietfaecher);
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
    console.log('User found:', { 
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
      console.log('Email validation failed:', { status: user.kontakt.status, newsletterConfirmed: user.kontakt.newsletterConfirmed });
      res.status(400).json({ 
        success: false, 
        message: `E-Mail-Status ist ${user.kontakt.status}. Benutzer muss E-Mail bestätigen.` 
      });
      return;
    }
    
    // Prüfen ob alle Mietfächer verfügbar sind
    console.log('Checking assigned mietfaecher:', assignedMietfaecher);
    const mietfaecher = await Mietfach.find({
      _id: { $in: assignedMietfaecher },
      verfuegbar: true,
      zugewiesenAn: { $exists: false }
    });
    
    console.log('Available mietfaecher found:', { 
      requested: assignedMietfaecher.length, 
      found: mietfaecher.length,
      foundIds: mietfaecher.map(m => (m._id as any).toString())
    });
    
    if (mietfaecher.length !== assignedMietfaecher.length) {
      res.status(400).json({ 
        success: false, 
        message: `Nur ${mietfaecher.length} von ${assignedMietfaecher.length} Mietfächern sind verfügbar` 
      });
      return;
    }
    
    // Vertrag aus pendingBooking-Daten erstellen
    const { createVertragFromPendingBooking } = require('./vertragController');
    
    const vertragData = await createVertragFromPendingBooking(userId, user.pendingBooking.packageData, assignedMietfaecher, priceValidation.validAdjustments);
    
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
    
    // E-Mail an Vendor senden
    const { sendAdminConfirmationEmail } = require('../utils/emailService');
    await sendAdminConfirmationEmail({
      vendorName: user.kontakt.name,
      email: user.kontakt.email,
      mietfaecher: mietfaecher,
      vertrag: vertragData.vertrag,
      packageData: user.pendingBooking.packageData
    });
    
    // Pending Booking als abgeschlossen markieren
    user.pendingBooking.status = 'completed';
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Buchung erfolgreich bestätigt, Vertrag erstellt und E-Mail gesendet',
      vertragId: vertragData.vertragId
    });
  } catch (err) {
    console.error('Fehler beim Bestätigen der Buchung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
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
    user.pendingBooking.status = 'cancelled';
    await user.save();
    
    // TODO: E-Mail an Vendor senden mit Ablehnungsgrund
    
    res.json({ 
      success: true, 
      message: 'Buchung abgelehnt' 
    });
  } catch (err) {
    console.error('Fehler beim Ablehnen der Buchung:', err);
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
    console.error('Fehler beim Abrufen der User:', err);
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
    console.error('Fehler beim Abrufen der Store Opening Settings:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Store Opening Settings' 
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
          console.error('Fehler beim Senden der E-Mail an', vendor.kontakt.email, err);
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
    console.error('Fehler beim Aktualisieren der Store Opening Settings:', err);
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
    console.error('Error getting trial statistics:', err);
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
    console.error('Error getting launch day metrics:', err);
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
    console.error('Error toggling vendor visibility:', err);
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
    console.error('Error bulk toggling vendor visibility:', err);
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
    console.error('Error triggering trial activation:', err);
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
    console.error('Error triggering trial status update:', err);
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
    console.error('Error activating vendor trial:', err);
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
    console.error('Error getting scheduled jobs status:', err);
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
    console.error('Error updating vendor verification:', err);
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
    console.error('Error getting system health:', err);
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
    console.error('Error in simple health check:', err);
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
    console.error('Error getting component health:', err);
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
    console.error('Error getting performance metrics:', err);
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
    console.error('Error getting detailed metrics:', err);
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
    console.error('Error getting endpoint metrics:', err);
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
    console.error('Error getting active alerts:', err);
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
    console.error('Error getting alert history:', err);
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
    console.error('Error resolving alert:', err);
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
    console.error('Error sending test alert:', err);
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
    console.error('Error getting monitoring settings:', err);
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
    console.error('Error updating monitoring settings:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating monitoring settings' 
    });
  }
};

// Real-time Monitoring Dashboard Data
export const getMonitoringDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all monitoring data in parallel
    const [
      healthStatus,
      performanceSummary,
      activeAlerts,
      alertStats,
      trialStats,
      jobsStatus
    ] = await Promise.all([
      HealthCheckService.performHealthCheck(),
      Promise.resolve(performanceMonitor.getPerformanceSummary()),
      Promise.resolve(AlertingService.getActiveAlerts()),
      Promise.resolve(AlertingService.getAlertStatistics()),
      ScheduledJobs.getTrialStatistics(),
      Promise.resolve(ScheduledJobs.getJobsStatus())
    ]);
    
    const thresholds = performanceMonitor.checkPerformanceThresholds();
    
    res.json({
      success: true,
      dashboard: {
        health: healthStatus,
        performance: {
          summary: performanceSummary,
          thresholds
        },
        alerts: {
          active: activeAlerts,
          statistics: alertStats
        },
        trials: trialStats.success ? trialStats.statistics : null,
        scheduledJobs: jobsStatus,
        timestamp: new Date()
      }
    });
  } catch (err) {
    console.error('Error getting monitoring dashboard:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error getting monitoring dashboard' 
    });
  }
};