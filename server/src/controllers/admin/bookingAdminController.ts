/**
 * @file bookingAdminController.ts
 * @purpose Admin booking management controller handling pending bookings, Mietfach assignment,
 * booking confirmation/rejection, availability checks, and Zusatzleistungen management.
 * Extracted from adminController.ts for better modularity.
 * @created 2026-03-25
 */

import { Request, Response } from 'express';
import User from '../../models/User';
import Mietfach from '../../models/Mietfach';
import Vertrag from '../../models/Vertrag';
import { BookingStatus } from '../../types/modelTypes';
import bookingEvents from '../../utils/bookingEvents';
import { PriceCalculationService } from '../../services/priceCalculationService';
import logger from '../../utils/logger';

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
    const { validatePriceAdjustments, validateZusatzleistungen } = require('../../utils/validation');

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
    const { createVertragFromPendingBooking } = require('../vertragController');

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
    // Note: emailQueue bypassed in favor of direct sending below

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
    const emailJobId = 'direct-email-' + Date.now();

    try {
      const { sendAdminConfirmationEmail } = require('../../utils/emailService');

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
    const { reason: _reason } = req.body;

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
/**
 * Check Mietfach availability for specific types and time period
 * @description Filters and returns Mietfächer by requested types with availability status
 * @param req - Express request with startDate, duration, requestedTypes
 * @param res - Express response with filtered Mietfächer and availability data
 * @returns Promise<void> - Resolves with availability data or error message
 * @complexity O(n*m) where n is number of Mietfächer and m is booking checks per unit
 * @security Validates input parameters and handles error cases
 */
export const checkMietfachAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, duration, requestedTypes } = req.body;

    // Validate required fields
    if (!startDate || !duration || !requestedTypes) {
      res.status(400).json({
        success: false,
        message: 'Fehlende Pflichtfelder: startDate, duration, requestedTypes sind erforderlich'
      });
      return;
    }

    // Validate requestedTypes is an array
    if (!Array.isArray(requestedTypes)) {
      res.status(400).json({
        success: false,
        message: 'requestedTypes muss ein Array sein'
      });
      return;
    }

    // Parse and validate dates
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Ungültiges startDate Format'
      });
      return;
    }

    // Calculate end date from start date + duration (in months)
    const end = new Date(start);
    end.setMonth(end.getMonth() + duration);

    logger.info('Processing Mietfach availability check:', {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      duration,
      requestedTypes,
      rawRequestBody: req.body
    });

    // Build type filter query
    let typeQuery = {};
    if (!requestedTypes.includes('all')) {
      // Map frontend category names to database Mietfach types
      const typeMapping = {
        'regal': ['regal', 'regal-a', 'regal-b'],
        'kuehl': ['kuehl', 'kuehlregal', 'gekuehlt'],
        'gefrier': ['gefrier', 'gefrierregal'],
        'sonstiges': ['sonstiges', 'verkaufstisch', 'vitrine', 'tisch'],
        'schaufenster': ['schaufenster']
      };

      // Build array of all database types that match requested categories
      const dbTypes: string[] = [];
      for (const requestedType of requestedTypes) {
        const mappedTypes = typeMapping[requestedType as keyof typeof typeMapping];
        if (mappedTypes) {
          dbTypes.push(...mappedTypes);
          logger.info(`Mapped requested type '${requestedType}' to database types:`, mappedTypes);
        } else {
          logger.warn(`Unknown requested type '${requestedType}' - no mapping found`);
        }
      }

      if (dbTypes.length > 0) {
        typeQuery = { typ: { $in: dbTypes } };
        logger.info('Built type filter query:', { typeQuery, dbTypes });
      } else {
        logger.warn('No valid database types found for requested types:', requestedTypes);
      }
    }

    // Find all Mietfächer that match the type filter
    // Note: We do NOT filter by verfuegbar here to allow checking future availability
    // for currently occupied Mietfächer
    const allMietfaecher = await Mietfach.find({
      ...typeQuery
    }).select('bezeichnung typ beschreibung groesse standort features verfuegbar');

    logger.info('TASK-026 DEBUG - All Mietfächer found (including verfuegbar status):', {
      count: allMietfaecher.length,
      mietfaecher: allMietfaecher.map(m => ({
        _id: m._id,
        bezeichnung: m.bezeichnung,
        typ: m.typ,
        verfuegbar: m.verfuegbar
      }))
    });

    logger.info('Found Mietfächer matching type filter:', {
      count: allMietfaecher.length,
      foundTypes: allMietfaecher.map(m => m.typ),
      uniqueTypesFound: [...new Set(allMietfaecher.map(m => m.typ))],
      queryUsed: { verfuegbar: true, ...typeQuery }
    });

    // Check availability for each Mietfach
    const mietfaecherWithAvailability = await Promise.all(
      allMietfaecher.map(async (mietfach) => {
        try {
          const available = await mietfach.isAvailableForPeriod(start, end);

          const result: any = {
            _id: mietfach._id,
            bezeichnung: mietfach.bezeichnung,
            typ: mietfach.typ,
            beschreibung: mietfach.beschreibung,
            groesse: mietfach.groesse,
            standort: mietfach.standort,
            features: mietfach.features,
            available: available,
            conflicts: [],
            nextAvailable: null
          };

          // If not available, find conflicts and next available date
          if (!available) {
            const Vertrag = require('../../models/Vertrag').default;

            // Find overlapping contracts
            const conflicts = await Vertrag.find({
              'services.mietfach': mietfach._id,
              status: { $in: ['active', 'scheduled', 'pending'] },
              'availabilityImpact.from': { $lt: end },
              'availabilityImpact.to': { $gt: start }
            }).select('user availabilityImpact status').populate('user', 'kontakt.name');

            result.conflicts = conflicts.map((contract: any) => ({
              contractId: contract._id,
              userName: contract.user?.kontakt?.name || 'Unbekannt',
              from: contract.availabilityImpact?.from,
              to: contract.availabilityImpact?.to,
              status: contract.status
            }));

            // Find next available date (after all conflicts end)
            if (conflicts.length > 0) {
              const latestEndDate = Math.max(
                ...conflicts.map((c: any) => new Date(c.availabilityImpact?.to || c.availabilityImpact?.from).getTime())
              );
              result.nextAvailable = new Date(latestEndDate);
            }
          }

          return result;
        } catch (error) {
          logger.error(`Error checking availability for Mietfach ${mietfach._id}:`, error);
          return {
            _id: mietfach._id,
            bezeichnung: mietfach.bezeichnung,
            typ: mietfach.typ,
            beschreibung: mietfach.beschreibung,
            groesse: mietfach.groesse,
            standort: mietfach.standort,
            features: mietfach.features,
            available: false,
            conflicts: [],
            nextAvailable: null,
            error: 'Fehler bei der Verfügbarkeitsprüfung'
          };
        }
      })
    );

    const availableCount = mietfaecherWithAvailability.filter(m => m.available).length;

    logger.info('Mietfach availability check completed:', {
      total: mietfaecherWithAvailability.length,
      available: availableCount,
      unavailable: mietfaecherWithAvailability.length - availableCount
    });

    res.json({
      success: true,
      mietfaecher: mietfaecherWithAvailability
    });

  } catch (err) {
    logger.error('Fehler bei der Mietfach-Verfügbarkeitsprüfung:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler bei der Verfügbarkeitsprüfung'
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
    const PackageTracking = require('../../models/PackageTracking').default;
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
    const PackageTracking = require('../../models/PackageTracking').default;
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
        const { sendPackageArrivalConfirmation } = require('../../utils/emailService');
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
    const PackageTracking = require('../../models/PackageTracking').default;
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
        const { sendLagerserviceActivationNotification } = require('../../utils/emailService');
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
