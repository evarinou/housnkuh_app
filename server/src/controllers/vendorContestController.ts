// server/src/controllers/vendorContestController.ts
import { Request, Response } from 'express';
import VendorContest from '../models/VendorContest';
import { sendVendorContestEmail } from '../utils/emailService';

/**
 * Validiert die Eingaben des Vendor Contest Formulars
 */
const validateVendorContestForm = (data: any): { valid: boolean; errors?: string[] } => {
  const errors: string[] = [];

  // Pflichtfelder prüfen
  if (!data.name || data.name.trim() === '') {
    errors.push('Name ist erforderlich');
  }

  if (!data.email || data.email.trim() === '') {
    errors.push('E-Mail ist erforderlich');
  } else {
    // E-Mail-Format prüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('E-Mail-Format ist ungültig');
    }
  }

  if (!data.guessedVendors || !Array.isArray(data.guessedVendors) || data.guessedVendors.length === 0) {
    errors.push('Mindestens eine Vermutung ist erforderlich');
  } else {
    // Prüfen, ob alle Vermutungen nicht-leere Strings sind
    const invalidGuesses = data.guessedVendors.filter((vendor: any) => 
      typeof vendor !== 'string' || vendor.trim() === ''
    );
    if (invalidGuesses.length > 0) {
      errors.push('Alle Vermutungen müssen gültige Werte sein');
    }
  }

  // Telefonnummer ist optional, aber wenn sie angegeben wird, sollte sie ein gültiges Format haben
  if (data.phone && data.phone.trim() !== '') {
    const phoneRegex = /^[0-9\s\-\+\(\)]{6,20}$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push('Telefonnummer-Format ist ungültig');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

/**
 * Handler für das Absenden eines Vendor Contest Formulars
 */
export const submitVendorContest = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Vendor Contest Formular erhalten:', req.body);
    
    // Validierung der Formularfelder
    const validation = validateVendorContestForm(req.body);
    if (!validation.valid) {
      res.status(400).json({ success: false, errors: validation.errors });
      return;
    }
    
    // Daten für das Speichern vorbereiten
    const contestData = {
      name: req.body.name.trim(),
      email: req.body.email.trim(),
      guessedVendors: req.body.guessedVendors.map((vendor: string) => vendor.trim()),
      phone: req.body.phone?.trim() || undefined,
      isRead: false
    };
    
    // In die Datenbank speichern
    const contest = new VendorContest(contestData);
    await contest.save();
    
    // E-Mail versenden (optional)
    try {
      await sendVendorContestEmail({
        name: contestData.name,
        email: contestData.email,
        guessedVendors: contestData.guessedVendors,
        phone: contestData.phone
      });
    } catch (emailError) {
      console.error('Fehler beim Versenden der E-Mail:', emailError);
      // Fortsetzung trotz E-Mail-Fehler, da die Daten gespeichert wurden
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Ihre Teilnahme wurde erfolgreich registriert. Viel Glück beim Gewinnspiel!'
    });
    
  } catch (error) {
    console.error('Fehler bei der Verarbeitung des Vendor Contest Formulars:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.'
    });
  }
};

/**
 * Gibt alle Vendor Contest Einträge zurück
 */
export const getVendorContests = async (req: Request, res: Response): Promise<void> => {
  try {
    const contests = await VendorContest.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: contests.length,
      data: contests
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Vendor Contest Einträge:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Vendor Contest Einträge'
    });
  }
};

/**
 * Gibt einen einzelnen Vendor Contest Eintrag zurück
 */
export const getVendorContest = async (req: Request, res: Response): Promise<void> => {
  try {
    const contest = await VendorContest.findById(req.params.id);
    
    if (!contest) {
      res.status(404).json({
        success: false,
        message: 'Vendor Contest Eintrag nicht gefunden'
      });
      return;
    }
    
    // Markiere als gelesen, wenn der Eintrag abgerufen wird
    if (!contest.isRead) {
      contest.isRead = true;
      await contest.save();
    }
    
    res.status(200).json({
      success: true,
      data: contest
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Vendor Contest Eintrags:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Vendor Contest Eintrags'
    });
  }
};

/**
 * Aktualisiert einen Vendor Contest Eintrag
 */
export const updateVendorContest = async (req: Request, res: Response): Promise<void> => {
  try {
    // Zulässige Felder für die Aktualisierung
    const updates = {
      isRead: req.body.isRead
    };
    
    const contest = await VendorContest.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!contest) {
      res.status(404).json({
        success: false,
        message: 'Vendor Contest Eintrag nicht gefunden'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: contest
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Vendor Contest Eintrags:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Vendor Contest Eintrags'
    });
  }
};

/**
 * Löscht einen Vendor Contest Eintrag
 */
export const deleteVendorContest = async (req: Request, res: Response): Promise<void> => {
  try {
    const contest = await VendorContest.findByIdAndDelete(req.params.id);
    
    if (!contest) {
      res.status(404).json({
        success: false,
        message: 'Vendor Contest Eintrag nicht gefunden'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Vendor Contest Eintrag erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Vendor Contest Eintrags:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Vendor Contest Eintrags'
    });
  }
};

/**
 * Gibt Statistiken über die Vendor Contest Einträge zurück
 */
export const getVendorContestStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalEntries = await VendorContest.countDocuments();
    const unreadEntries = await VendorContest.countDocuments({ isRead: false });
    
    // Häufigste Vermutungen
    const allContests = await VendorContest.find();
    const vendorGuessCount: { [key: string]: number } = {};
    
    allContests.forEach(contest => {
      contest.guessedVendors.forEach(vendor => {
        vendorGuessCount[vendor] = (vendorGuessCount[vendor] || 0) + 1;
      });
    });
    
    const topGuesses = Object.entries(vendorGuessCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([vendor, count]) => ({ vendor, count }));
    
    res.status(200).json({
      success: true,
      data: {
        totalEntries,
        unreadEntries,
        topGuesses
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Vendor Contest Statistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Vendor Contest Statistiken'
    });
  }
};