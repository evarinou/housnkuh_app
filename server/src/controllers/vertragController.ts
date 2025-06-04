// server/src/controllers/vertragController.ts
import { Request, Response } from 'express';
import Vertrag from '../models/Vertrag';

// Alle Verträge abrufen
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
      
      // Berechne Gesamtpreis und andere Werte (nur für gültige Mietfächer)
      const validServices = services.filter(service => service.mietfach);
      const monthlyTotal = validServices.reduce((sum, service) => sum + (service.monatspreis || 0), 0);
      const contractDurationMonths = services.length > 0 && services[0].mietende && services[0].mietbeginn 
        ? Math.ceil((new Date(services[0].mietende).getTime() - new Date(services[0].mietbeginn).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 12;
      const gesamtpreis = monthlyTotal * contractDurationMonths;
      
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
        gesamtpreis: gesamtpreis,
        provision: 5, // Standard-Provision
        status: 'aktiv', // Default status
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
    console.error('Fehler beim Abrufen der Verträge:', err);
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
    console.error('Fehler beim Abrufen des Vertrags:', err);
    res.status(500).json({ 
      success: false,
      message: 'Serverfehler beim Abrufen des Vertrags' 
    });
  }
};

// Neuen Vertrag erstellen
export const createVertrag = async (req: Request, res: Response): Promise<void> => {
  try {
    const newVertrag = new Vertrag(req.body);
    const savedVertrag = await newVertrag.save();
    
    // Vertrag mit Beziehungen zurückgeben
    const populatedVertrag = await Vertrag.findById(savedVertrag._id)
      .populate('user', 'username kontakt.name')
      .populate('services.mietfach', 'bezeichnung typ');
    
    res.status(201).json({
      success: true,
      vertrag: populatedVertrag
    });
  } catch (err) {
    console.error('Fehler beim Erstellen des Vertrags:', err);
    res.status(400).json({ 
      success: false,
      message: 'Fehler beim Erstellen des Vertrags' 
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
    console.error('Fehler beim Aktualisieren des Vertrags:', err);
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
    console.error('Fehler beim Löschen des Vertrags:', err);
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
    console.error('Fehler beim Abrufen der Verträge für den Benutzer:', err);
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
    console.error('Fehler beim Hinzufügen des Services:', err);
    res.status(400).json({ 
      success: false,
      message: 'Fehler beim Hinzufügen des Services zum Vertrag' 
    });
  }
};

// Mapping von packageBuilder IDs zu Mietfach-Typen
const packageTypeMapping: Record<string, string> = {
  'block-a': 'regal',         // Regal Typ A
  'block-b': 'regal-b',       // Regal Typ B
  'block-cold': 'kuehlregal', // Kühlregal
  'block-table': 'vitrine'    // Verkaufstisch/Vitrine
};

// Vertrag aus pendingBooking erstellen mit spezifischen Mietfächern
export const createVertragFromPendingBooking = async (userId: string, packageData: any, assignedMietfaecher: string[]): Promise<{ success: boolean; message?: string; vertragId?: string; vertrag?: any }> => {
  try {
    console.log('createVertragFromPendingBooking called with:', { userId, assignedMietfaecher, packageDataKeys: Object.keys(packageData || {}) });
    const Mietfach = require('../models/Mietfach').default;
    const Settings = require('../models/Settings').default;
    
    // Store Status prüfen
    const settings = await Settings.getSettings();
    const isStoreOpen = settings.isStoreOpen();
    
    // Services für die zugewiesenen Mietfächer erstellen
    const services = [];
    const currentDate = new Date();
    
    // Mietbeginn abhängig vom Store Status
    let mietbeginn: Date;
    if (isStoreOpen) {
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
            'block-table': ['vitrine', 'tisch']
          };
          
          // Prüfe ob der Mietfach-Typ zu diesem Package-Option passt
          if (typeMapping[packageOption.id]?.includes(mietfach.typ)) {
            monatspreis = packageOption.price || mietfach.preis || 0;
            break;
          }
        }
      }
      
      services.push({
        mietfach: mietfach._id,
        mietbeginn: mietbeginn,
        mietende: mietende,
        monatspreis: monatspreis
      });
    }
    
    // Vertrag erstellen - nur mit den Feldern, die im Schema definiert sind
    const newVertrag = new Vertrag({
      user: userId,
      datum: currentDate,
      services: services
    });
    
    console.log('Creating Vertrag with data:', { 
      user: userId, 
      datum: currentDate, 
      servicesCount: services.length 
    });

    const savedVertrag = await newVertrag.save();
    
    // Vollständigen Vertrag für E-Mail-Benachrichtigung laden
    const populatedVertrag = await Vertrag.findById(savedVertrag._id)
      .populate('user', 'kontakt.name kontakt.email')
      .populate('services.mietfach', 'bezeichnung typ beschreibung standort groesse preis');
    
    return {
      success: true,
      vertragId: savedVertrag._id.toString(),
      vertrag: populatedVertrag
    };
  } catch (error) {
    console.error('Fehler beim Erstellen des Vertrags aus pendingBooking:', error);
    return {
      success: false,
      message: 'Fehler beim Erstellen des Vertrags'
    };
  }
};