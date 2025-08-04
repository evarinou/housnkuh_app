/**
 * @file Contract controller for the housnkuh marketplace application
 * @description Contract management controller with pricing, Zusatzleistungen, and trial period handling
 * Handles all contract operations including creation, pricing calculations, and service management
 */

import { Request, Response } from 'express';
import Vertrag from '../models/Vertrag';
import User from '../models/User';
import mongoose from 'mongoose';
import { 
  PriceCalculationRequest, 
  CreateVertragRequest,
  MIETFACH_BASE_PRICES,
  ZUSATZLEISTUNGEN_PRICING,
  calculateRabatt,
  calculateMonthlyTotal,
  MietfachTyp
} from '../types/zusatzleistungenTypes';
import logger from '../utils/logger';

/**
 * Retrieves all contracts with populated user and Mietfach data
 * @description Fetches all contracts with complete user and service information for admin overview
 * @param req - Express request object
 * @param res - Express response object with transformed contract data
 * @returns Promise<void> - Resolves with contract list including pricing calculations or error message
 * @complexity O(n*m) where n is number of contracts and m is average services per contract
 */
export const getAllVertraege = async (req: Request, res: Response): Promise<void> => {
  try {
    const vertraege = await Vertrag.find()
      .populate('user', 'username kontakt.name kontakt.email')
      .populate('services.mietfach', 'bezeichnung typ beschreibung standort groesse preis')
      .sort({ createdAt: -1 });
    
    // Verträge in das erwartete Frontend-Format transformieren
    const transformedVertraege = vertraege.map((vertrag: any) => {
      const user = vertrag.user as any;
      const services = vertrag.services as any[];
      
      // Use the already calculated values from the contract
      const validServices = services.filter(service => service.mietfach);
      
      // Get base prices (before discount) for display
      let monthlyMietfachTotal = validServices.reduce((sum, service) => sum + (service.monatspreis || 0), 0);
      
      // Add Zusatzleistungen costs if present
      let zusatzleistungenCosts = 0;
      if (vertrag.zusatzleistungen_kosten && vertrag.zusatzleistungen) {
        if (vertrag.zusatzleistungen.lagerservice) {
          zusatzleistungenCosts += vertrag.zusatzleistungen_kosten.lagerservice_monatlich || 0;
        }
        if (vertrag.zusatzleistungen.versandservice) {
          zusatzleistungenCosts += vertrag.zusatzleistungen_kosten.versandservice_monatlich || 0;
        }
      }
      
      // Use the correct calculation: discount applies to base price, not with zusatzleistungen
      const subtotal = monthlyMietfachTotal; // Only Mietfach price gets discount
      const discount = vertrag.discount || 0;
      const discountedMietfachTotal = subtotal * (1 - discount);
      const monthlyTotal = discountedMietfachTotal + zusatzleistungenCosts;
      
      // Use the totalMonthlyPrice from the contract if it exists (it's already calculated correctly)
      const finalMonthlyTotal = vertrag.totalMonthlyPrice || monthlyTotal;
      
      const contractDurationMonths = vertrag.contractDuration || 
        (services.length > 0 && services[0].mietende && services[0].mietbeginn 
          ? Math.ceil((new Date(services[0].mietende).getTime() - new Date(services[0].mietbeginn).getTime()) / (1000 * 60 * 60 * 24 * 30))
          : 12);
      const gesamtpreis = finalMonthlyTotal * contractDurationMonths;
      
      return {
        _id: vertrag._id,
        vertragsnummer: `V${new Date(vertrag.datum).getFullYear()}-${String(vertrag._id).slice(-6)}`,
        kunde: {
          _id: user._id,
          name: user.kontakt?.name || user.username || 'Unbekannt',
          email: user.kontakt?.email || 'Keine E-Mail'
        },
        mietfaecher: validServices.map(service => ({
          _id: service.mietfach._id,
          name: service.mietfach.bezeichnung || `Mietfach ${service.mietfach._id}`,
          typ: service.mietfach.typ || 'unbekannt',
          preis: service.monatspreis || 0
        })),
        startdatum: services.length > 0 ? services[0].mietbeginn : vertrag.datum,
        enddatum: services.length > 0 && services[0].mietende ? services[0].mietende : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        monthlyBreakdown: {
          mietfaecherCosts: monthlyMietfachTotal,
          zusatzleistungenCosts: zusatzleistungenCosts,
          subtotal: subtotal, // Only Mietfach cost
          discount: discount,
          discountAmount: subtotal * discount,
          total: finalMonthlyTotal
        },
        // Add provision information
        provision: {
          rate: vertrag.provisionssatz || 7,
          model: vertrag.provisionssatz === 7 ? 'Premium' : 'Basic'
        },
        gesamtpreis: gesamtpreis,
        zusatzleistungen: vertrag.zusatzleistungen || null,
        zusatzleistungen_kosten: vertrag.zusatzleistungen_kosten || null,
        status: vertrag.status || 'aktiv',
        zahlungsart: 'Überweisung', // Default
        zahlungsrhythmus: 'monatlich', // Default
        createdAt: vertrag.createdAt,
        updatedAt: vertrag.updatedAt
      };
    });
    
    res.json({
      success: true,
      vertraege: transformedVertraege
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen der Verträge:', err);
    res.status(500).json({ 
      success: false,
      message: 'Serverfehler beim Abrufen der Verträge' 
    });
  }
};

// Vertrag nach ID abrufen
export const getVertragById = async (req: Request, res: Response): Promise<void> => {
  try {
    const vertrag = await Vertrag.findById(req.params.id)
      .populate('user', 'username kontakt.name adressen')
      .populate('services.mietfach', 'bezeichnung typ');
    
    if (!vertrag) {
      res.status(404).json({ 
        success: false,
        message: 'Vertrag nicht gefunden' 
      });
      return;
    }
    
    res.json({
      success: true,
      vertrag
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen des Vertrags:', err);
    res.status(500).json({ 
      success: false,
      message: 'Serverfehler beim Abrufen des Vertrags' 
    });
  }
};

// Neuen Vertrag erstellen
export const createVertrag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vertragService } = await import('../services/vertragService');
    
    // Create contract with trial integration
    const savedVertrag = await vertragService.createVertrag(req.body);
    
    // Return populated contract
    const populatedVertrag = await Vertrag.findById(savedVertrag._id)
      .populate('user', 'username kontakt.name registrationStatus trialEndDate')
      .populate('probemonatUserId', 'username kontakt.name')
      .populate('services.mietfach', 'bezeichnung typ');
    
    res.status(201).json({
      success: true,
      vertrag: populatedVertrag
    });
  } catch (err) {
    logger.error('Fehler beim Erstellen des Vertrags:', err);
    res.status(400).json({ 
      success: false,
      message: err instanceof Error ? err.message : 'Fehler beim Erstellen des Vertrags'
    });
  }
};

// Vertrag aktualisieren
export const updateVertrag = async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedVertrag = await Vertrag.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )
      .populate('user', 'username kontakt.name')
      .populate('services.mietfach', 'bezeichnung typ');
    
    if (!updatedVertrag) {
      res.status(404).json({ 
        success: false,
        message: 'Vertrag nicht gefunden' 
      });
      return;
    }
    
    res.json({
      success: true,
      vertrag: updatedVertrag
    });
  } catch (err) {
    logger.error('Fehler beim Aktualisieren des Vertrags:', err);
    res.status(400).json({ 
      success: false,
      message: 'Fehler beim Aktualisieren des Vertrags' 
    });
  }
};

// Vertrag löschen
export const deleteVertrag = async (req: Request, res: Response): Promise<void> => {
  try {
    const deletedVertrag = await Vertrag.findByIdAndDelete(req.params.id);
    
    if (!deletedVertrag) {
      res.status(404).json({ 
        success: false,
        message: 'Vertrag nicht gefunden' 
      });
      return;
    }
    
    res.json({ 
      success: true,
      message: 'Vertrag erfolgreich gelöscht' 
    });
  } catch (err) {
    logger.error('Fehler beim Löschen des Vertrags:', err);
    res.status(500).json({ 
      success: false,
      message: 'Serverfehler beim Löschen des Vertrags' 
    });
  }
};

// Verträge nach Benutzer abrufen
export const getVertraegeByUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const vertraege = await Vertrag.find({ user: userId })
      .populate('services.mietfach', 'bezeichnung typ');
    
    res.json({
      success: true,
      vertraege
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen der Verträge für den Benutzer:', err);
    res.status(500).json({ 
      success: false,
      message: 'Serverfehler beim Abrufen der Verträge für diesen Benutzer' 
    });
  }
};

// Service zu bestehendem Vertrag hinzufügen
export const addServiceToVertrag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const newService = req.body;
    
    const vertrag = await Vertrag.findById(id);
    
    if (!vertrag) {
      res.status(404).json({ 
        success: false,
        message: 'Vertrag nicht gefunden' 
      });
      return;
    }
    
    vertrag.services.push(newService);
    const updatedVertrag = await vertrag.save();
    
    // Vertrag mit Beziehungen zurückgeben
    const populatedVertrag = await Vertrag.findById(updatedVertrag._id)
      .populate('user', 'username kontakt.name')
      .populate('services.mietfach', 'bezeichnung typ');
    
    res.json({
      success: true,
      vertrag: populatedVertrag
    });
  } catch (err) {
    logger.error('Fehler beim Hinzufügen des Services:', err);
    res.status(400).json({ 
      success: false,
      message: 'Fehler beim Hinzufügen des Services zum Vertrag' 
    });
  }
};

// Mapping von packageBuilder IDs zu Mietfach-Typen
const packageTypeMapping: Record<string, string> = {
  'block-a': 'regal',           // Regal Typ A
  'block-b': 'regal-b',         // Regal Typ B
  'block-cold': 'kuehlregal',   // Kühlregal
  'block-frozen': 'gefrierregal', // Gefrierregal
  'block-table': 'verkaufstisch', // Verkaufstisch
  'block-other': 'sonstiges',   // Sonstiges
  'block-display': 'schaufenster' // Schaufenster
};

// Vertrag aus pendingBooking erstellen mit spezifischen Mietfächern
export const createVertragFromPendingBooking = async (
  userId: string, 
  packageData: any, 
  assignedMietfaecher: string[], 
  priceAdjustments?: Record<string, number>, 
  scheduledStartDate?: Date,
  zusatzleistungenValidation?: any
): Promise<{ success: boolean; message?: string; vertragId?: string; vertrag?: any }> => {
  try {
    logger.info('createVertragFromPendingBooking called with:', { 
      userId, 
      assignedMietfaecher, 
      packageDataKeys: Object.keys(packageData || {}),
      packageDataDiscount: packageData?.discount,
      rentalDuration: packageData?.rentalDuration,
      priceAdjustments,
      scheduledStartDate,
      hasZusatzleistungen: !!zusatzleistungenValidation?.zusatzleistungen
    });
    const Mietfach = require('../models/Mietfach').default;
    const Settings = require('../models/Settings').default;
    
    // Load user to check trial status
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if this is a trial booking
    const isTrialBooking = user.registrationStatus === 'trial_active' &&
                          user.trialEndDate &&
                          user.trialEndDate > new Date();
    
    // Store Status prüfen
    const settings = await Settings.getSettings();
    const isStoreOpen = settings.isStoreOpen();
    
    // Services für die zugewiesenen Mietfächer erstellen
    const services = [];
    const currentDate = new Date();
    
    // Mietbeginn - verwende scheduledStartDate wenn bereitgestellt, sonst Store Status
    let mietbeginn: Date;
    if (scheduledStartDate) {
      // Admin hat ein spezifisches Startdatum festgelegt
      mietbeginn = new Date(scheduledStartDate);
    } else if (isStoreOpen) {
      // Store ist offen - Mietbeginn sofort
      mietbeginn = new Date();
    } else {
      // Store ist noch nicht offen - Mietbeginn bei Store-Eröffnung
      if (settings.storeOpening.openingDate) {
        mietbeginn = new Date(settings.storeOpening.openingDate);
      } else {
        // Fallback wenn kein Öffnungsdatum gesetzt ist
        mietbeginn = new Date();
        mietbeginn.setMonth(mietbeginn.getMonth() + 3); // Default: 3 Monate in der Zukunft
      }
    }
    
    // 30-Tage Probemonat + gewählte Dauer
    const trialDays = 30;
    const mietende = new Date(mietbeginn);
    mietende.setDate(mietende.getDate() + trialDays); // 30 Tage Probemonat
    mietende.setMonth(mietende.getMonth() + (packageData.rentalDuration || 3)); // + gewählte Dauer
    
    // Zahlungspflichtig ab Ende des Probemonats
    const zahlungspflichtigAb = new Date(mietbeginn);
    zahlungspflichtigAb.setDate(zahlungspflichtigAb.getDate() + trialDays);
    
    // Alle zugewiesenen Mietfächer laden
    const mietfaecher = await Mietfach.find({ _id: { $in: assignedMietfaecher } });
    
    for (const mietfach of mietfaecher) {
      // Preis basierend auf Mietfach-Typ aus packageData ermitteln
      let monatspreis = mietfach.preis || 0;
      
      // Versuche den Preis aus den packageOptions zu ermitteln
      if (packageData.packageOptions) {
        for (const packageOption of packageData.packageOptions) {
          // Mapping zwischen PackageBuilder-Typ und Mietfach-Typ
          const typeMapping: Record<string, string[]> = {
            'block-a': ['regal', 'regal-a'],
            'block-b': ['regal-b'],
            'block-cold': ['kuehlregal', 'gekuehlt'],
            'block-frozen': ['gefrierregal'],
            'block-table': ['verkaufstisch', 'vitrine', 'tisch'],
            'block-other': ['sonstiges'],
            'block-display': ['schaufenster']
          };
          
          // Prüfe ob der Mietfach-Typ zu diesem Package-Option passt
          if (typeMapping[packageOption.id]?.includes(mietfach.typ)) {
            monatspreis = packageOption.price || mietfach.preis || 0;
            break;
          }
        }
      }
      
      // Preis-Anpassungen durch Admin anwenden
      const mietfachId = mietfach._id.toString();
      if (priceAdjustments && priceAdjustments[mietfachId]) {
        const adjustedPrice = priceAdjustments[mietfachId];
        if (adjustedPrice > 0 && adjustedPrice <= 1000) { // Validierung: Preis zwischen 0 und 1000 Euro
          monatspreis = adjustedPrice;
          logger.info(`Price adjustment applied for Mietfach ${mietfachId}: ${monatspreis}`);
        } else {
          logger.warn(`Invalid price adjustment for Mietfach ${mietfachId}: ${adjustedPrice}`);
        }
      }
      
      services.push({
        mietfach: mietfach._id,
        mietbeginn: mietbeginn,
        mietende: mietende,
        monatspreis: monatspreis
      });
    }
    
    // Calculate total monthly price from services with discount applied
    const totalMonthlyPrice = services.reduce((total, service) => total + service.monatspreis, 0);
    
    // Add Zusatzleistungen costs if present
    let zusatzleistungenCosts = 0;
    if (zusatzleistungenValidation?.zusatzleistungen_kosten) {
      zusatzleistungenCosts = (zusatzleistungenValidation.zusatzleistungen_kosten.lagerservice_monatlich || 0) +
                             (zusatzleistungenValidation.zusatzleistungen_kosten.versandservice_monatlich || 0);
    }
    
    const discount = packageData.discount || 0;
    const finalMonthlyPrice = (totalMonthlyPrice + zusatzleistungenCosts) * (1 - discount);
    
    // Vertrag erstellen - nur mit den Feldern, die im Schema definiert sind
    // Prepare contract data
    const contractData: any = {
      user: userId,
      datum: currentDate,
      services: services,
      scheduledStartDate: mietbeginn,
      endDate: mietende,
      status: 'scheduled',
      contractDuration: packageData.rentalDuration || 3,
      discount: discount, // Include discount from packageData
      totalMonthlyPrice: finalMonthlyPrice, // Set the calculated total with discount applied
      zahlungspflichtigAb: zahlungspflichtigAb, // Payment starts after trial period
      // Trial-specific fields
      istProbemonatBuchung: isTrialBooking,
      probemonatUserId: isTrialBooking ? user._id : undefined,
      gekuendigtInProbemonat: false,
      availabilityImpact: {
        from: mietbeginn,
        to: mietende
      }
    };

    // Add Zusatzleistungen if validated and present, or from packageData
    if (zusatzleistungenValidation?.zusatzleistungen) {
      contractData.zusatzleistungen = zusatzleistungenValidation.zusatzleistungen;
      contractData.zusatzleistungen_kosten = zusatzleistungenValidation.zusatzleistungen_kosten;
      
      logger.info('Adding Zusatzleistungen to contract from validation:', {
        zusatzleistungen: zusatzleistungenValidation.zusatzleistungen,
        zusatzleistungen_kosten: zusatzleistungenValidation.zusatzleistungen_kosten
      });
    } else if (packageData.zusatzleistungen && (packageData.zusatzleistungen.lagerservice || packageData.zusatzleistungen.versandservice)) {
      // Fallback: Use zusatzleistungen from packageData if no validation was provided
      contractData.zusatzleistungen = packageData.zusatzleistungen;
      
      // Calculate costs based on packageData zusatzleistungen
      const lagerservice_kosten = packageData.zusatzleistungen.lagerservice ? 20 : 0;
      const versandservice_kosten = packageData.zusatzleistungen.versandservice ? 5 : 0;
      
      contractData.zusatzleistungen_kosten = {
        lagerservice_monatlich: lagerservice_kosten,
        versandservice_monatlich: versandservice_kosten
      };
      
      logger.info('Adding Zusatzleistungen to contract from packageData:', {
        zusatzleistungen: packageData.zusatzleistungen,
        zusatzleistungen_kosten: contractData.zusatzleistungen_kosten
      });
      
      // Recalculate final price with zusatzleistungen costs
      const zusatzleistungenCostsFromPackage = lagerservice_kosten + versandservice_kosten;
      contractData.totalMonthlyPrice = (totalMonthlyPrice + zusatzleistungenCostsFromPackage) * (1 - discount);
    }

    // Add required fields that might be missing
    contractData.provisionssatz = contractData.provisionssatz || 7; // Default to Premium
    contractData.totalMonthlyPrice = contractData.totalMonthlyPrice || finalMonthlyPrice;
    contractData.contractDuration = contractData.contractDuration || 6;
    contractData.discount = contractData.discount || discount;
    
    const newVertrag = new Vertrag(contractData);
    
    logger.info('Creating Vertrag with data:', { 
      user: userId, 
      datum: currentDate, 
      servicesCount: services.length,
      scheduledStartDate: mietbeginn,
      status: 'scheduled',
      contractDuration: packageData.rentalDuration || 3,
      discount: discount,
      totalMonthlyPrice: finalMonthlyPrice,
      originalPrice: totalMonthlyPrice,
      zusatzleistungenCosts: zusatzleistungenCosts,
      zahlungspflichtigAb: zahlungspflichtigAb
    });

    const savedVertrag = await newVertrag.save();
    
    // Vollständigen Vertrag für E-Mail-Benachrichtigung laden
    const populatedVertrag = await Vertrag.findById(savedVertrag._id)
      .populate('user', 'kontakt.name kontakt.email')
      .populate('services.mietfach', 'bezeichnung typ beschreibung standort groesse preis');
    
    return {
      success: true,
      vertragId: (savedVertrag._id as mongoose.Types.ObjectId).toString(),
      vertrag: populatedVertrag
    };
  } catch (error) {
    logger.error('Fehler beim Erstellen des Vertrags aus pendingBooking:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Erstellen des Vertrags'
    };
  }
};

// Price calculation endpoint with Zusatzleistungen support
export const calculatePriceWithZusatzleistungen = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mietfachTyp, laufzeitMonate, provisionssatz, zusatzleistungen }: PriceCalculationRequest = req.body;

    // Validate required fields
    if (!mietfachTyp || !laufzeitMonate || provisionssatz === undefined) {
      res.status(400).json({ 
        success: false,
        error: 'Fehlende Pflichtfelder: mietfachTyp, laufzeitMonate, provisionssatz sind erforderlich' 
      });
      return;
    }

    // Import and use the new price calculation service
    const PriceCalculationService = (await import('../services/priceCalculationService')).default;

    try {
      const priceBreakdown = PriceCalculationService.calculateMietfachPrice(
        mietfachTyp as MietfachTyp,
        laufzeitMonate,
        provisionssatz,
        zusatzleistungen
      );

      const formattedBreakdown = PriceCalculationService.formatPriceBreakdown(priceBreakdown);

      res.json({
        success: true,
        preisDetails: {
          grundpreis: formattedBreakdown.packageCosts,
          zusatzleistungen: {
            lagerservice: zusatzleistungen?.lagerservice ? ZUSATZLEISTUNGEN_PRICING.lagerservice : 0,
            versandservice: zusatzleistungen?.versandservice ? ZUSATZLEISTUNGEN_PRICING.versandservice : 0
          },
          monatlicheKosten: formattedBreakdown.monthlyTotal,
          laufzeitMonate,
          zwischensumme: formattedBreakdown.totalForDuration,
          rabatt: formattedBreakdown.discount,
          rabattBetrag: formattedBreakdown.discountAmount,
          gesamtpreis: formattedBreakdown.totalForDuration,
          provision: {
            satz: provisionssatz,
            monatlich: formattedBreakdown.provision.monthlyAmount
          }
        }
      });
    } catch (serviceError) {
      res.status(400).json({ 
        success: false,
        error: serviceError instanceof Error ? serviceError.message : 'Fehler bei der Preisberechnung' 
      });
    }
  } catch (error) {
    logger.error('Fehler bei Preisberechnung:', error);
    res.status(500).json({ 
      success: false,
      error: 'Fehler bei der Preisberechnung' 
    });
  }
};

// Update Zusatzleistungen for existing contract (Vendor endpoint)
export const updateZusatzleistungen = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { lagerservice, versandservice } = req.body;
    const vendorId = (req as any).user?._id;

    // Validate input
    if (typeof lagerservice !== 'boolean' && typeof versandservice !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Mindestens ein Zusatzleistung-Flag (lagerservice oder versandservice) ist erforderlich'
      });
      return;
    }

    // Find contract and verify ownership
    const vertrag = await Vertrag.findById(id);
    if (!vertrag) {
      res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
      return;
    }

    // Verify vendor owns this contract
    if (vertrag.user.toString() !== vendorId.toString()) {
      res.status(403).json({
        success: false,
        error: 'Nicht berechtigt, diesen Vertrag zu ändern'
      });
      return;
    }

    // Check if contract allows zusatzleistungen (need at least one service/mietfach)
    if (!vertrag.services || vertrag.services.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Zusatzleistungen können nur mit einem gebuchten Mietfach gebucht werden'
      });
      return;
    }

    // Update zusatzleistungen
    const updates: any = {};
    if (typeof lagerservice === 'boolean') {
      updates['zusatzleistungen.lagerservice'] = lagerservice;
    }
    if (typeof versandservice === 'boolean') {
      updates['zusatzleistungen.versandservice'] = versandservice;
    }

    const updatedVertrag = await Vertrag.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).populate('user', 'username kontakt.name kontakt.email')
     .populate('services.mietfach', 'bezeichnung typ beschreibung standort');

    // Create package tracking entries for newly booked services
    const PackageTracking = require('../models/PackageTracking').default;
    
    if (lagerservice && !vertrag.zusatzleistungen?.lagerservice) {
      await new PackageTracking({
        vertrag_id: id,
        package_typ: 'lagerservice',
        status: 'erwartet'
      }).save();
    }
    
    if (versandservice && !vertrag.zusatzleistungen?.versandservice) {
      await new PackageTracking({
        vertrag_id: id,
        package_typ: 'versandservice',
        status: 'erwartet'
      }).save();
    }

    // Send admin notification for new zusatzleistungen bookings
    const hasNewBookings = (lagerservice && !vertrag.zusatzleistungen?.lagerservice) || 
                          (versandservice && !vertrag.zusatzleistungen?.versandservice);
    
    if (hasNewBookings && updatedVertrag?.user && typeof updatedVertrag.user === 'object' && 'kontakt' in updatedVertrag.user) {
      try {
        const user = updatedVertrag.user as any;
        const { sendAdminZusatzleistungenNotification } = require('../utils/emailService');
        await sendAdminZusatzleistungenNotification({
          vendorName: user.kontakt.name,
          vendorEmail: user.kontakt.email,
          contractId: (updatedVertrag._id as any).toString(),
          zusatzleistungen: {
            lagerservice: !!lagerservice,
            versandservice: !!versandservice,
            lagerservice_kosten: updatedVertrag.zusatzleistungen_kosten?.lagerservice_monatlich || 20,
            versandservice_kosten: updatedVertrag.zusatzleistungen_kosten?.versandservice_monatlich || 5
          }
        });
      } catch (emailError) {
        logger.error('Error sending admin zusatzleistungen notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      vertrag: updatedVertrag,
      message: 'Zusatzleistungen erfolgreich aktualisiert'
    });

  } catch (error) {
    logger.error('Fehler beim Aktualisieren der Zusatzleistungen:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Aktualisieren der Zusatzleistungen'
    });
  }
};

// Enhanced contract creation with Zusatzleistungen support
export const createVertragWithZusatzleistungen = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mietfachId, laufzeitMonate, provisionssatz, zusatzleistungen }: CreateVertragRequest = req.body;
    const vendorId = (req as any).user?._id;

    // Validate required fields
    if (!mietfachId || !laufzeitMonate || provisionssatz === undefined || !vendorId) {
      res.status(400).json({ 
        success: false,
        error: 'Fehlende Pflichtfelder: mietfachId, laufzeitMonate, provisionssatz sind erforderlich' 
      });
      return;
    }

    // Validate zusatzleistungen - only available with Premium model (15%)
    if (zusatzleistungen && (zusatzleistungen.lagerservice || zusatzleistungen.versandservice)) {
      if (provisionssatz !== 15) {
        res.status(400).json({ 
          success: false,
          error: 'Zusatzleistungen sind nur mit dem Premium-Provisionsmodell (15%) verfügbar' 
        });
        return;
      }
    }

    // Import Mietfach model
    const Mietfach = require('../models/Mietfach').default;
    
    // Validate mietfach exists and is available
    const mietfach = await Mietfach.findById(mietfachId);
    if (!mietfach) {
      res.status(404).json({ 
        success: false,
        error: 'Mietfach nicht gefunden' 
      });
      return;
    }

    // Check if mietfach is available for the requested period
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + laufzeitMonate);
    
    const isAvailable = await mietfach.isAvailableForPeriod(startDate, endDate);
    if (!isAvailable) {
      res.status(400).json({ 
        success: false,
        error: 'Mietfach ist für den gewählten Zeitraum nicht verfügbar' 
      });
      return;
    }

    // Calculate prices
    const grundpreis = mietfach.preis || 0;
    const monatlicheKosten = calculateMonthlyTotal(grundpreis, zusatzleistungen);
    const rabatt = calculateRabatt(laufzeitMonate);
    const discount = rabatt / 100;

    // Create contract services
    const services = [{
      mietfach: mietfachId,
      mietbeginn: startDate,
      mietende: endDate,
      monatspreis: grundpreis
    }];

    // Get vendor's provision rate
    const vendor = await User.findById(vendorId);
    const vendorProvisionssatz = vendor?.provisionssatz || 7; // Default to Premium
    
    // Create vertrag with zusatzleistungen
    const vertrag = new Vertrag({
      user: vendorId,
      datum: new Date(),
      services: services,
      scheduledStartDate: startDate,
      totalMonthlyPrice: monatlicheKosten,
      contractDuration: laufzeitMonate,
      discount: discount,
      provisionssatz: vendorProvisionssatz,
      zusatzleistungen: zusatzleistungen || { lagerservice: false, versandservice: false },
      status: 'pending',
      zahlungspflichtigAb: startDate,
      availabilityImpact: {
        from: startDate,
        to: endDate
      }
    });

    const savedVertrag = await vertrag.save();

    // Populate for response
    const populatedVertrag = await Vertrag.findById(savedVertrag._id)
      .populate('user', 'username kontakt.name kontakt.email')
      .populate('services.mietfach', 'bezeichnung typ beschreibung standort groesse preis');

    // Calculate response pricing details
    const lagerserviceKosten = zusatzleistungen?.lagerservice ? ZUSATZLEISTUNGEN_PRICING.lagerservice : 0;
    const versandserviceKosten = zusatzleistungen?.versandservice ? ZUSATZLEISTUNGEN_PRICING.versandservice : 0;
    const gesamtMonatlich = grundpreis + lagerserviceKosten + versandserviceKosten;
    const gesamtpreis = (gesamtMonatlich * laufzeitMonate) * (1 - discount);

    res.status(201).json({
      success: true,
      vertrag: populatedVertrag,
      preisDetails: {
        grundpreis: grundpreis,
        lagerservice: lagerserviceKosten,
        versandservice: versandserviceKosten,
        gesamtMonatlich: gesamtMonatlich,
        laufzeit: laufzeitMonate,
        rabatt: rabatt,
        gesamtpreis: gesamtpreis
      }
    });
  } catch (error) {
    logger.error('Fehler beim Erstellen des Vertrags:', error);
    res.status(500).json({ 
      success: false,
      error: 'Interner Serverfehler beim Erstellen des Vertrags' 
    });
  }
};