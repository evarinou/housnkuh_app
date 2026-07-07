/**
 * @file vendorBookingController.ts
 * @purpose Handles vendor booking, contract, trial, dashboard, and invoice management operations.
 * Extracted from vendorAuthController.ts to improve separation of concerns.
 * @created 2026-03-26
 */

import { Response, NextFunction } from 'express';
import User from '../../models/User';
import Vertrag from '../../models/Vertrag';
import mongoose, { Types } from 'mongoose';
import { BookingStatus } from '../../types/modelTypes';
import logger from '../../utils/logger';
import Invoice from '../../models/Invoice';
import fs from 'fs';
import path from 'path';
import { sendBookingConfirmation, sendCancellationConfirmationEmail } from '../../utils/emailService';
import { AuthRequest } from '../../middleware/auth';
import AppError from '../../utils/AppError';

// Buchung nach E-Mail-Bestätigung abschließen
export const completeBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user || !user.pendingBooking) {
      res.status(404).json({
        success: false,
        message: 'Keine ausstehende Buchung gefunden'
      });
      return;
    }

    if (user.kontakt.status !== 'aktiv') {
      res.status(400).json({
        success: false,
        message: 'E-Mail muss zuerst bestätigt werden'
      });
      return;
    }

    // Vertrag aus pendingBooking-Daten erstellen
    const { createVertragFromPendingBooking } = require('../vertragController');

    // Wenn kein pendingBooking vorhanden ist, abbrechen
    if (!user.pendingBooking) {
      res.status(400).json({
        success: false,
        message: 'Keine Buchungsdaten vorhanden'
      });
      return;
    }

    // Vertrag erstellen
    const success = await createVertragFromPendingBooking(userId, user.pendingBooking.packageData);

    if (!success) {
      res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Vertrags'
      });
      return;
    }

    // Pending Booking entfernen
    user.pendingBooking = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Buchung erfolgreich abgeschlossen'
    });
  } catch (err) {
    next(new AppError('Ein Serverfehler ist aufgetreten', 500, err));
  }
};

// Vendor Verträge abrufen
export const getVendorContracts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
               try {
                 const { userId } = req.params;

                 // Überprüfen, ob der anfragende Benutzer seine eigenen Verträge abfragt
                 if ((req as any).user?.id !== userId) {
                   res.status(403).json({ error: "Keine Berechtigung" });
                   return;
                 }

                 // Use simple find with populate to ensure Mietfach details are properly loaded
                 const vertraege = await Vertrag.find({ user: userId })
                   .populate('services.mietfach')
                   .sort({ datum: -1 })
                   .lean();

                 // Verträge formatieren
                 const formattedVertraege = vertraege.map((vertrag: any) => ({
                   id: vertrag._id,
                   datum: vertrag.datum,
                   status: "aktiv", // Status basierend auf Enddatum berechnen
                   services: vertrag.services.map((service: any) => ({
                     mietfach: service.mietfach,
                     mietbeginn: service.mietbeginn,
                     mietende: service.mietende,
                     monatspreis: service.monatspreis,
                     status: new Date(service.mietende) > new Date() ? "aktiv" : "beendet"
                   })),
                   gesamtpreis: vertrag.totalMonthlyPrice || vertrag.services.reduce((sum: number, service: any) => sum + service.monatspreis, 0)
                 }));

                 res.json({ vertraege: formattedVertraege });
               } catch (error) {
                 next(new AppError("Fehler beim Abrufen der Verträge", 500, error));
               }
             };

// Zusätzliche Buchung für authentifizierte Vendors
export const additionalBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, packageData } = req.body;

    logger.info('Additional booking request received:', { userId, packageData });
    logger.debug('User from token:', { user: req.user });

    // Verify user is authenticated and matches token
    if (!req.user || req.user.id !== userId) {
      logger.error('Authorization failed:', { tokenUserId: req.user?.id, requestUserId: userId });
      res.status(403).json({
        success: false,
        message: 'Unauthorized booking attempt'
      });
      return;
    }

    // Verify user exists and is a vendor
    logger.debug('Looking up user with ID:', { userId });
    const user = await User.findById(userId);
    logger.debug('User found:', { found: user ? 'Yes' : 'No', isVendor: user?.isVendor ? 'Is vendor' : 'Not vendor' });

    if (!user || !user.isVendor) {
      logger.error('User validation failed:', { userExists: !!user, isVendor: user?.isVendor });
      res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
      return;
    }

    // Extract booking information
    const {
      selectedProvisionType,
      packageCounts,
      zusatzleistungen,
      rentalDuration,
      totalCost,
      discount,
      packageOptions
    } = packageData;

    // Create additional booking record
    const additionalBookingData = {
      userId: userId,
      bookingType: 'additional',
      provisionType: selectedProvisionType,
      packages: Object.entries(packageCounts).map(([packageId, count]) => ({
        packageId,
        count: count as number,
        packageType: packageId
      })).filter(pkg => pkg.count > 0),
      zusatzleistungen: zusatzleistungen,
      rentalDuration,
      monthlyCost: totalCost.monthly,
      provision: totalCost.provision,
      status: 'pending',
      createdAt: new Date(),
      notes: `Additional booking by authenticated vendor ${(user as any).name}`
    };

    // Store the booking data in user notes for now (admin can process manually)
    logger.info('Storing additional booking request for admin processing');

    const bookingNote = `ADDITIONAL BOOKING REQUEST - ${new Date().toISOString()}
User: ${(user as any).name} (${(user as any).email})
Provision: ${selectedProvisionType}
Packages: ${JSON.stringify(packageCounts)}
Zusatzleistungen: ${zusatzleistungen ? Object.entries(zusatzleistungen).filter(([_key, value]) => value).map(([key]) => key).join(', ') : 'Keine'}
Duration: ${rentalDuration} months
Monthly Cost: €${totalCost.monthly}
Status: Pending Admin Review`;

    logger.debug('Booking note created:', { bookingNote });

    // Check if user already has a pending booking
    const existingPendingBooking = (user as any).pendingBooking;

    // Update user to indicate pending additional booking (compatible with admin dashboard)
    try {
      const newPendingBooking = {
        packageData: {
          selectedProvisionType,
          packageCounts,
          zusatzleistungen,
          rentalDuration,
          totalCost,
          discount: discount || 0,  // Explicitly include discount
          packageOptions: packageOptions,  // Include package options for reference
          bookingType: 'additional',
          previousBooking: existingPendingBooking ? 'User had existing pending booking' : 'First booking'
        },
        createdAt: new Date(),
        status: BookingStatus.PENDING,
        note: bookingNote
      };

      await User.findByIdAndUpdate(userId, {
        hasPendingBooking: true,
        lastBookingDate: new Date(),
        pendingBooking: newPendingBooking
      });

      logger.info('User updated successfully with pending booking');

      if (existingPendingBooking) {
        logger.info('Note: User had existing pending booking, replaced with new additional booking');
      }
    } catch (userUpdateError) {
      logger.error('Error updating user:', userUpdateError);
      // Continue even if this fails - we can still process the booking
      logger.warn('Continuing despite user update error...');
    }

    // Send confirmation email
    try {
      // Create package options based on packageCounts
      const packageOptions = Object.entries(packageCounts)
        .filter(([_, count]) => (count as number) > 0)
        .map(([packageId, count]) => {
          // Map package IDs to their details
          const packageMap: { [key: string]: { name: string; price: number } } = {
            'verkaufsblock-a': { name: 'Verkaufsblock Lage A', price: 35 },
            'verkaufsblock-b': { name: 'Verkaufsblock Lage B', price: 15 },
            'verkaufsblock-gekuehlt': { name: 'Verkaufsblock gekühlt', price: 50 },
            'verkaufsblock-gefroren': { name: 'Verkaufsblock gefroren', price: 60 },
            'verkaufstisch': { name: 'Verkaufstisch', price: 40 },
            'schaufenster-klein': { name: 'Schaufenster klein', price: 30 },
            'schaufenster-gross': { name: 'Schaufenster groß', price: 60 },
            'flexibler-bereich': { name: 'Flexibler Bereich', price: 0 }
          };

          const packageInfo = packageMap[packageId] || { name: packageId, price: 0 };
          return {
            id: packageId,
            name: packageInfo.name,
            price: packageInfo.price,
            count: count
          };
        });

      const bookingConfirmationData = {
        vendorName: (user as any).name,
        email: (user as any).email,
        confirmationToken: '', // Additional bookings don't need email confirmation
        packageData: {
          selectedProvisionType,
          packageCounts,
          packageOptions,
          zusatzleistungen,
          rentalDuration,
          totalCost: {
            monthly: totalCost.monthly,
            provision: totalCost.provision
          }
        }
      };

      await sendBookingConfirmation(bookingConfirmationData);
    } catch (emailError) {
      logger.warn('Could not send booking confirmation email:', emailError);
      // Continue without failing the booking
    }

    res.json({
      success: true,
      message: 'Additional booking submitted successfully',
      bookingId: new Date().getTime().toString(), // Temporary ID
      bookingData: additionalBookingData
    });

  } catch (error) {
    next(new AppError('Failed to process additional booking', 500, error));
  }
};

// M005 Implementation: Get vendor bookings with status
export const getVendorBookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Verify user authorization
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    // Find user with bookings
    const user = await User.findById(userId).select('pendingBooking registrationStatus isVendor');
    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }

    // Get contracts for this user
    const contracts = await Vertrag.find({ user: userId })
      .populate('services.mietfach')
      .sort({ createdAt: -1 });

    const bookings = [];

    // Add pending booking if exists and no contracts exist (to avoid duplicates)
    if (user.pendingBooking && contracts.length === 0) {
      const pendingBooking = {
        id: `pending_${userId}`,
        status: user.pendingBooking.status || BookingStatus.PENDING,
        requestedAt: user.pendingBooking.createdAt || user.createdAt,
        confirmedAt: null,
        scheduledStartDate: null,
        mietfach: null,
        packageDetails: {
          totalCost: user.pendingBooking.packageData?.totalCost || { monthly: 0 },
          duration: user.pendingBooking.packageData?.rentalDuration || 12,
          packages: user.pendingBooking.packageData?.packageCounts || {},
          zusatzleistungen: user.pendingBooking.packageData?.zusatzleistungen || {}
        }
      };

      if (!status || status === 'pending') {
        bookings.push(pendingBooking);
      }
    }

    // Add confirmed bookings from contracts
    contracts.forEach(contract => {
      // Calculate price breakdown
      const mietfachBase = contract.services.reduce((sum: number, service: any) => sum + (service.monatspreis || 0), 0);
      const lagerserviceKosten = contract.zusatzleistungen?.lagerservice ?
        (contract.zusatzleistungen_kosten?.lagerservice_monatlich || 20) : 0;
      const versandserviceKosten = contract.zusatzleistungen?.versandservice ?
        (contract.zusatzleistungen_kosten?.versandservice_monatlich || 5) : 0;
      const zusatzleistungenTotal = lagerserviceKosten + versandserviceKosten;
      const subtotal = mietfachBase + zusatzleistungenTotal;
      const discountAmount = subtotal * (contract.discount || 0);

      const contractBooking = {
        id: (contract._id as any).toString(),
        status: contract.status === 'scheduled' ? 'confirmed' : contract.status,
        requestedAt: contract.createdAt,
        confirmedAt: contract.createdAt,
        scheduledStartDate: contract.scheduledStartDate,
        actualStartDate: contract.actualStartDate,
        // Trial information
        istProbemonatBuchung: contract.istProbemonatBuchung || false,
        zahlungspflichtigAb: contract.zahlungspflichtigAb,
        mietfach: contract.services.map((service: any) => ({
          id: service.mietfach?._id?.toString(),
          bezeichnung: service.mietfach?.bezeichnung,
          typ: service.mietfach?.typ
        })),
        packageDetails: {
          totalCost: {
            monthly: contract.totalMonthlyPrice
          },
          duration: contract.endDate && contract.startDate ?
            Math.round((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) :
            contract.contractDuration || 12,
          services: contract.services,
          zusatzleistungen: contract.zusatzleistungen,
          priceBreakdown: {
            mietfachBase,
            zusatzleistungen: {
              lagerservice: lagerserviceKosten,
              versandservice: versandserviceKosten
            },
            discount: contract.discount || 0,
            discountAmount,
            subtotal
          }
        }
      };

      if (!status || status === contractBooking.status) {
        bookings.push(contractBooking);
      }
    });

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;
    const paginatedBookings = bookings.slice(skip, skip + limitNum);

    res.json({
      success: true,
      bookings: paginatedBookings,
      pagination: {
        total: bookings.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(bookings.length / limitNum)
      }
    });

  } catch (error) {
    next(new AppError('Fehler beim Abrufen der Buchungen', 500, error));
  }
};

// M005 Implementation: Get specific vendor booking by ID
export const getVendorBookingById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, bookingId } = req.params;

    // Verify user authorization
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    // Handle pending booking
    if (bookingId.startsWith('pending_')) {
      const user = await User.findById(userId).select('pendingBooking registrationStatus isVendor');
      if (!user || !user.isVendor || !user.pendingBooking) {
        res.status(404).json({
          success: false,
          message: 'Buchung nicht gefunden'
        });
        return;
      }

      const booking = {
        id: bookingId,
        status: user.pendingBooking.status || BookingStatus.PENDING,
        requestedAt: user.pendingBooking.createdAt || user.createdAt,
        confirmedAt: null,
        scheduledStartDate: null,
        mietfach: null,
        packageDetails: {
          totalCost: user.pendingBooking.packageData?.totalCost || { monthly: 0 },
          duration: user.pendingBooking.packageData?.rentalDuration || 12,
          packages: user.pendingBooking.packageData?.packageCounts || {},
          zusatzleistungen: user.pendingBooking.packageData?.zusatzleistungen || {}
        }
      };

      res.json({
        success: true,
        booking
      });
      return;
    }

    // Handle contract booking
    const contract = await Vertrag.findOne({ _id: bookingId, user: userId })
      .populate('services.mietfach');

    if (!contract) {
      res.status(404).json({
        success: false,
        message: 'Buchung nicht gefunden'
      });
      return;
    }

    const booking = {
      id: (contract._id as any).toString(),
      status: contract.status === 'active' ? 'confirmed' : contract.status,
      requestedAt: contract.createdAt,
      confirmedAt: contract.createdAt,
      scheduledStartDate: contract.scheduledStartDate,
      actualStartDate: contract.actualStartDate,
      mietfach: contract.services.map((service: any) => ({
        id: service.mietfach?._id?.toString(),
        bezeichnung: service.mietfach?.bezeichnung,
        typ: service.mietfach?.typ
      })),
      packageDetails: {
        totalCost: {
          monthly: contract.services.reduce((sum: number, service: any) => sum + (service.monatspreis || 0), 0)
        },
        duration: contract.endDate && contract.startDate ?
          Math.round((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) :
          contract.contractDuration || 12,
        services: contract.services
      }
    };

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    next(new AppError('Fehler beim Abrufen der Buchung', 500, error));
  }
};

// M005 Implementation: Get dashboard messages for vendor
export const getDashboardMessages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;

    // Verify user authorization
    if (!req.user || req.user.id !== userId) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    const user = await User.findById(userId).select('pendingBooking registrationStatus isVendor');
    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }

    const messages = [];

    // Check for pending bookings
    if (user.pendingBooking && user.pendingBooking.status === BookingStatus.PENDING) {
      messages.push({
        id: 'pending_booking',
        type: 'info',
        title: 'Buchungsanfrage in Bearbeitung',
        message: 'Deine Buchungsanfrage wird bearbeitet. Wir werden dich per E-Mail informieren, sobald deine Mietfächer zugewiesen wurden.',
        dismissible: false,
        priority: 1,
        createdAt: user.pendingBooking.createdAt || user.createdAt
      });
    }

    // Check trial status
    if (user.registrationStatus === 'trial_active') {
      messages.push({
        id: 'trial_active',
        type: 'success',
        title: 'Testphase aktiv',
        message: 'Deine Testphase ist aktiv. Nutze diese Zeit, um alle Funktionen zu erkunden.',
        dismissible: true,
        priority: 2,
        createdAt: user.createdAt
      });
    } else if (user.registrationStatus === 'trial_expired') {
      messages.push({
        id: 'trial_expired',
        type: 'warning',
        title: 'Testphase abgelaufen',
        message: 'Deine Testphase ist abgelaufen. Aktiviere dein Abonnement, um weiterhin alle Funktionen nutzen zu können.',
        dismissible: false,
        priority: 1,
        createdAt: user.createdAt
      });
    }

    // Sort messages by priority and creation date
    messages.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    next(new AppError('Fehler beim Abrufen der Dashboard-Nachrichten', 500, error));
  }
};

// M005 Implementation: Dismiss dashboard message
export const dismissDashboardMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messageId } = req.params;

    if (!req.user) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    // For now, just acknowledge the dismissal
    // In a full implementation, we might store dismissed message IDs per user
    logger.info('User dismissed message:', { userId: req.user.id, messageId });

    res.json({
      success: true,
      message: 'Nachricht ausgeblendet'
    });

  } catch (error) {
    next(new AppError('Fehler beim Ausblenden der Nachricht', 500, error));
  }
};

// M006 S004 Implementation: Get trial status and trial bookings
export const getTrialStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    const user = await User.findById(req.user.id).select('registrationStatus trialStartDate trialEndDate isVendor');
    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }

    const isInTrial = user.registrationStatus === 'trial_active';
    let daysRemaining = 0;

    if (isInTrial && user.trialEndDate) {
      const now = new Date();
      const endDate = new Date(user.trialEndDate);
      const diff = endDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // Get trial bookings (contracts with trial flag)
    const trialContracts = await Vertrag.find({
      user: req.user.id,
      istProbemonatBuchung: true
    }).populate('services.mietfach');

    const trialBookings = trialContracts.map(contract => ({
      id: (contract._id as mongoose.Types.ObjectId).toString(),
      mietfachNummer: contract.services.map((s: any) => s.mietfach?.bezeichnung || 'N/A').join(', '),
      startDate: contract.startDate || contract.createdAt,
      trialEndDate: user.trialEndDate,
      willBeChargedOn: user.trialEndDate,
      regularPrice: contract.services.reduce((sum: number, service: any) => sum + (service.monatspreis || 0), 0),
      isCancellable: contract.status !== 'cancelled' && isInTrial,
      isCancelled: contract.status === 'cancelled',
      status: contract.status
    }));

    const trialData = {
      isInTrial,
      trialBookings,
      daysRemaining,
      canBookMore: isInTrial && trialBookings.filter(b => !b.isCancelled).length === 0 // Can book more if no active trial bookings
    };

    res.json({
      success: true,
      data: trialData
    });

  } catch (error) {
    next(new AppError('Fehler beim Abrufen des Probemonat-Status', 500, error));
  }
};

// M006 S004 Implementation: Cancel trial booking
export const cancelTrialBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    if (!req.user) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }

    // Find the trial contract
    const contract = await Vertrag.findOne({
      _id: bookingId,
      user: req.user.id,
      istProbemonatBuchung: true
    });

    if (!contract) {
      res.status(404).json({
        success: false,
        message: 'Trial-Buchung nicht gefunden'
      });
      return;
    }

    // Check if cancellation is allowed
    if (user.registrationStatus !== 'trial_active') {
      res.status(400).json({
        success: false,
        message: 'Stornierung nur während des Probemonats möglich'
      });
      return;
    }

    if (contract.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: 'Buchung bereits storniert'
      });
      return;
    }

    // Cancel the contract
    contract.status = 'cancelled';
    contract.cancellationDate = new Date();
    contract.cancellationReason = reason || 'Trial cancellation';
    await contract.save();

    // Log the cancellation
    logger.info('Trial booking cancelled by user:', { bookingId, userId: req.user.id, reason: reason || 'No reason provided' });

    // Send cancellation confirmation email
    try {
      await sendCancellationConfirmationEmail(user.kontakt.email, user.kontakt.name, user.trialEndDate || null);
    } catch (emailError) {
      logger.error('Error sending cancellation email:', emailError);
      // Don't fail the cancellation if email fails
    }

    res.json({
      success: true,
      message: 'Trial-Buchung erfolgreich storniert'
    });

  } catch (error) {
    next(new AppError('Fehler beim Stornieren der Trial-Buchung', 500, error));
  }
};

// M006 S004 Implementation: Confirm trial booking
export const confirmTrialBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { mietfachId, startdatum, istProbemonatBuchung: _istProbemonatBuchung } = req.body;

    if (!req.user) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }

    // Verify trial status
    if (user.registrationStatus !== 'trial_active') {
      res.status(400).json({
        success: false,
        message: 'Probemonat-Buchung nur für aktive Trial-Nutzer möglich'
      });
      return;
    }

    // Check if user already has a trial booking
    const existingTrialBooking = await Vertrag.findOne({
      user: req.user.id,
      istProbemonatBuchung: true,
      status: { $ne: 'cancelled' }
    });

    if (existingTrialBooking) {
      res.status(400).json({
        success: false,
        message: 'Du hast bereits eine aktive Probemonat-Buchung'
      });
      return;
    }

    // Create trial contract
    const trialContract = new Vertrag({
      user: req.user.id,
      istProbemonatBuchung: true,
      probemonatUserId: req.user.id,
      scheduledStartDate: new Date(startdatum),
      zahlungspflichtigAb: user.trialEndDate,
      status: 'active',
      totalMonthlyPrice: 0,
      contractDuration: 1,
      discount: 0,
      provisionssatz: user.provisionssatz || 7, // Use user's provision rate
      services: [{
        mietfach: mietfachId,
        mietbeginn: new Date(startdatum),
        mietende: user.trialEndDate,
        monatspreis: 0 // Free during trial
      }]
    });

    await trialContract.save();

    // Send booking confirmation
    try {
      const bookingData = {
        vendorName: user.kontakt.name,
        email: user.kontakt.email,
        packageData: {
          selectedProvisionType: 'trial',
          packageCounts: { 'trial_mietfach': 1 },
          packageOptions: [{ id: 'trial', name: 'Probemonat Mietfach', price: 0 }],
          zusatzleistungen: { lagerservice: false, versandservice: false },
          rentalDuration: 1,
          totalCost: {
            monthly: 0,
            provision: 0
          }
        }
      };
      await sendBookingConfirmation(bookingData);
    } catch (emailError) {
      logger.error('Error sending booking confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    res.json({
      success: true,
      message: 'Probemonat-Buchung erfolgreich bestätigt',
      bookingId: (trialContract._id as mongoose.Types.ObjectId).toString()
    });

  } catch (error) {
    next(new AppError('Fehler bei der Buchungsbestätigung', 500, error));
  }
};
/**
 * TASK-014: Vendor invoice endpoints implementation
 * GET /api/vendor/invoices - list vendor's invoices
 */
export const getVendorInvoices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, month, year } = req.query;

    // Verify user authorization
    if (!req.user || !req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    // Find user and verify vendor status
    const user = await User.findById(req.user.id).select('isVendor');
    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }

    // Build query - vendors can only see their own invoices
    const query: any = { vendor: req.user.id };

    // Filter by status
    if (status && typeof status === 'string') {
      query.status = status;
    }

    // Filter by period
    if (month && year) {
      query['period.month'] = parseInt(month as string);
      query['period.year'] = parseInt(year as string);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Execute query with population
    const invoices = await Invoice.find(query)
      .populate('vendor', 'kontakt.name kontakt.email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Invoice.countDocuments(query);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der Rechnungen', 500, err));
  }
};

/**
 * GET /api/vendor/invoices/:id - get specific vendor invoice
 */
export const getVendorInvoiceById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify user authorization
    if (!req.user || !req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
      return;
    }

    const invoice = await Invoice.findById(id)
      .populate('vendor', 'kontakt.name kontakt.email kontakt.telefon adressen');

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
      return;
    }

    // Authorization check: vendors can only access their own invoices
    if (invoice.vendor._id.toString() !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Zugriff verweigert'
      });
      return;
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der Rechnung', 500, err));
  }
};

/**
 * GET /api/vendor/invoices/:id/download - download vendor invoice PDF
 */
export const downloadVendorInvoicePdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify user authorization
    if (!req.user || !req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
      return;
    }

    const invoice = await Invoice.findById(id)
      .populate('vendor', 'kontakt.name kontakt.email');

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
      return;
    }

    // Authorization check: vendors can only download their own invoices
    if (invoice.vendor._id.toString() !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Zugriff verweigert'
      });
      return;
    }

    // Generate PDF file path in storage directory (where PDFs are actually stored)
    const invoiceDate = new Date(invoice.createdAt);
    const year = invoiceDate.getFullYear();
    const month = String(invoiceDate.getMonth() + 1).padStart(2, '0');
    const pdfPath = path.join(process.cwd(), 'storage', 'invoices', year.toString(), month, `${invoice.invoiceNumber}.pdf`);

    // Check if PDF exists
    if (!fs.existsSync(pdfPath)) {
      res.status(404).json({
        success: false,
        message: 'PDF-Datei nicht gefunden'
      });
      return;
    }

    // Track download (for analytics/compliance)
    logger.info('Invoice PDF downloaded by vendor:', {
      invoiceId: id,
      vendorId: req.user.id,
      invoiceNumber: invoice.invoiceNumber
    });

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);

    // Stream the file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

  } catch (err) {
    next(new AppError('Serverfehler beim Herunterladen der PDF', 500, err));
  }
};

/**
 * GET /api/vendor/invoices/summary - get vendor billing summary
 */
export const getVendorInvoiceSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year = new Date().getFullYear(), month } = req.query;

    // Verify user authorization
    if (!req.user || !req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    // Find user and verify vendor status
    const user = await User.findById(req.user.id).select('isVendor');
    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }

    // Build query for vendor's invoices
    const query: any = { vendor: req.user.id };

    // Filter by year
    if (year) {
      query['period.year'] = parseInt(year as string);
    }

    // Filter by month if specified
    if (month) {
      query['period.month'] = parseInt(month as string);
    }

    // Get all matching invoices
    const invoices = await Invoice.find(query);

    // Calculate summary statistics
    const summary = {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      paidAmount: invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      pendingAmount: invoices
        .filter(inv => inv.status === 'draft' || inv.status === 'sent')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      overdueAmount: invoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      statusBreakdown: {
        draft: invoices.filter(inv => inv.status === 'draft').length,
        sent: invoices.filter(inv => inv.status === 'sent').length,
        paid: invoices.filter(inv => inv.status === 'paid').length,
        overdue: invoices.filter(inv => inv.status === 'overdue').length,
        cancelled: invoices.filter(inv => inv.status === 'cancelled').length
      },
      period: {
        year: parseInt(year as string),
        month: month ? parseInt(month as string) : null
      }
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der Rechnungsübersicht', 500, err));
  }
};
