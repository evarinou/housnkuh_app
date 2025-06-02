// server/src/controllers/contactController.ts
import { Request, Response } from 'express';
import { ContactFormData, sendContactFormEmail } from '../utils/emailService';
import Contact from '../models/Contact';

/**
 * Validiert die Eingaben des Kontaktformulars
 */
const validateContactForm = (data: any): { valid: boolean; errors?: string[] } => {
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

  if (!data.subject || data.subject.trim() === '') {
    errors.push('Betreff ist erforderlich');
  }

  if (!data.message || data.message.trim() === '') {
    errors.push('Nachricht ist erforderlich');
  }

  // Telefonnummer ist optional, aber wenn sie angegeben wird, sollte sie ein gültiges Format haben
  if (data.phone && data.phone.trim() !== '') {
    // Einfache Prüfung auf Zahlen, Leerzeichen, +, - (kann je nach Anforderung angepasst werden)
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
 * Handler für das Absenden eines Kontaktformulars
 */
export const submitContactForm = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Kontaktformular erhalten:', req.body);
    
    // Validierung der Formularfelder
    const validation = validateContactForm(req.body);
    if (!validation.valid) {
      res.status(400).json({ success: false, errors: validation.errors });
      return;
    }
    
    // Daten für das E-Mail-Versenden vorbereiten
    const contactData: ContactFormData = {
      name: req.body.name.trim(),
      email: req.body.email.trim(),
      subject: req.body.subject.trim(),
      message: req.body.message.trim(),
    };
    
    // Optional: Telefonnummer hinzufügen, wenn angegeben
    if (req.body.phone && req.body.phone.trim() !== '') {
      contactData.phone = req.body.phone.trim();
    }
    
    // E-Mails versenden (an Admin und Absender)
    const emailSent = await sendContactFormEmail(contactData);
    
    // In die Datenbank speichern
    const contact = new Contact({
      name: contactData.name,
      email: contactData.email,
      subject: contactData.subject,
      message: contactData.message,
      phone: contactData.phone,
      isRead: false,
      isResolved: false
    });
    
    await contact.save();
    
    if (emailSent) {
      res.status(200).json({ 
        success: true, 
        message: 'Ihre Anfrage wurde erfolgreich gesendet. Wir werden uns in Kürze bei Ihnen melden.'
      });
    } else {
      // Auch wenn die E-Mail nicht gesendet wurde, haben wir die Nachricht in der Datenbank gespeichert
      res.status(200).json({
        success: true,
        message: 'Ihre Anfrage wurde erfolgreich gespeichert. Wir werden uns in Kürze bei Ihnen melden.'
      });
    }
    
  } catch (error) {
    console.error('Fehler bei der Verarbeitung des Kontaktformulars:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal oder kontaktieren Sie uns direkt telefonisch.'
    });
  }
};

/**
 * Gibt alle Kontaktanfragen zurück
 */
export const getContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kontaktanfragen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Kontaktanfragen'
    });
  }
};

/**
 * Gibt eine einzelne Kontaktanfrage zurück
 */
export const getContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'Kontaktanfrage nicht gefunden'
      });
      return;
    }
    
    // Markiere als gelesen, wenn der Kontakt abgerufen wird
    if (!contact.isRead) {
      contact.isRead = true;
      await contact.save();
    }
    
    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kontaktanfrage:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Kontaktanfrage'
    });
  }
};

/**
 * Aktualisiert eine Kontaktanfrage
 */
export const updateContact = async (req: Request, res: Response): Promise<void> => {
  try {
    // Zulässige Felder für die Aktualisierung
    const updates = {
      isRead: req.body.isRead,
      isResolved: req.body.isResolved,
      notes: req.body.notes
    };
    
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'Kontaktanfrage nicht gefunden'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Kontaktanfrage:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Kontaktanfrage'
    });
  }
};

/**
 * Löscht eine Kontaktanfrage
 */
export const deleteContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'Kontaktanfrage nicht gefunden'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Kontaktanfrage erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Kontaktanfrage:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Kontaktanfrage'
    });
  }
};

/**
 * Handler für das Absenden eines Vendor-Contest-Formulars
 * (für zukünftige Implementierung)
 */
export const submitVendorContest = async (req: Request, res: Response): Promise<void> => {
  try {
    // Implementierung für Vendor-Contest-Formular
    // TODO: Implementieren, wenn die Feature benötigt wird
    
    res.status(501).json({
      success: false,
      message: 'Diese Funktion ist noch nicht implementiert.'
    });
  } catch (error) {
    console.error('Fehler bei der Verarbeitung des Vendor-Contest-Formulars:', error);
    res.status(500).json({
      success: false,
      message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.'
    });
  }
};