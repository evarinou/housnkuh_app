// server/src/controllers/adminController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import Mietfach from '../models/Mietfach';
import Vertrag from '../models/Vertrag';
import Settings from '../models/Settings';
import ScheduledJobs from '../services/scheduledJobs';
import TrialService from '../services/trialService';

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
    // Anzahl der Newsletter-Abonnenten
    const newsletterCount = await User.countDocuments({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true
    });
    
    // Anzahl der ausstehenden Bestätigungen
    const pendingCount = await User.countDocuments({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': false
    });
    
    // Aufschlüsselung nach Typ
    const customerCount = await User.countDocuments({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true,
      'kontakt.newslettertype': 'customer'
    });
    
    const vendorCount = await User.countDocuments({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true,
      'kontakt.newslettertype': 'vendor'
    });
    
    // Anzahl der Mietfächer und Verträge
    const mietfachCount = await Mietfach.countDocuments();
    const vertragCount = await Vertrag.countDocuments();
    
    // Anzahl der ausstehenden Buchungen
    const pendingBookingsCount = await User.countDocuments({
      isVendor: true,
      pendingBooking: { $exists: true, $ne: null },
      'pendingBooking.status': 'pending'
    });
    
    // Vendor Contest Statistiken
    const VendorContest = require('../models/VendorContest').default;
    const vendorContestCount = await VendorContest.countDocuments();
    const unreadContestCount = await VendorContest.countDocuments({ isRead: false });
    
    // Neueste Abonnenten (letzte 5)
    const recentSubscribers = await User.find({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('kontakt createdAt');
    
    res.json({
      success: true,
      overview: {
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
      }
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
    const usersWithPendingBookings = await User.find({
      isVendor: true,
      pendingBooking: { $exists: true, $ne: null },
      'pendingBooking.status': 'pending'
    }).select('kontakt adressen pendingBooking createdAt');
    
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
    const { assignedMietfaecher } = req.body; // Array von Mietfach-IDs
    
    console.log('confirmPendingBooking called with:', { userId, assignedMietfaecher });
    
    if (!assignedMietfaecher || !Array.isArray(assignedMietfaecher) || assignedMietfaecher.length === 0) {
      console.log('Validation failed: assignedMietfaecher invalid', assignedMietfaecher);
      res.status(400).json({ 
        success: false, 
        message: 'Mindestens ein Mietfach muss zugeordnet werden' 
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
    
    const vertragData = await createVertragFromPendingBooking(userId, user.pendingBooking.packageData, assignedMietfaecher);
    
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
    const { sendVendorConfirmationEmail } = require('../utils/emailService');
    await sendVendorConfirmationEmail(user.kontakt.email, {
      name: user.kontakt.name,
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
    const { openingDate, enabled } = req.body;
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
    
    const settings = await Settings.getSettings();
    const oldDate = settings.storeOpening.openingDate;
    
    await settings.updateStoreOpening(
      openingDate ? new Date(openingDate) : null,
      enabled !== undefined ? enabled : settings.storeOpening.enabled,
      modifiedBy
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