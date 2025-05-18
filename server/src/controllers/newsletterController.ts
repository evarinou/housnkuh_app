// server/src/controllers/newsletterController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import crypto from 'crypto';
import { sendNewsletterConfirmation } from '../utils/emailService';

// Newsletter-Anmeldung
export const subscribeNewsletter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, type = 'customer', name = '' } = req.body;
    
    if (!email) {
      res.status(400).json({ success: false, message: 'E-Mail-Adresse ist erforderlich' });
      return;
    }
    
    // Prüfen, ob Benutzer mit dieser E-Mail bereits existiert
    const existingUser = await User.findOne({ 'kontakt.email': email });
    
    if (existingUser) {
      // E-Mail existiert bereits, aktualisiere Newsletter-Einstellungen
      
      // Wenn Newsletter bereits bestätigt ist, erfolgreiche Antwort senden
      if (existingUser.kontakt.mailNewsletter && existingUser.kontakt.newsletterConfirmed) {
        res.status(200).json({ 
          success: true, 
          message: 'Sie sind bereits für den Newsletter angemeldet' 
        });
        return;
      }
      
      // Neuen Token für Bestätigung generieren
      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date();
      tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 Stunden gültig
      
      // User aktualisieren
      existingUser.kontakt.newslettertype = type;
      existingUser.kontakt.mailNewsletter = true;
      existingUser.kontakt.newsletterConfirmed = false;
      existingUser.kontakt.confirmationToken = token;
      existingUser.kontakt.tokenExpires = tokenExpires;
      existingUser.kontakt.status = 'pending';
      
      await existingUser.save();
      
      // Bestätigungs-E-Mail senden
      const emailSent = await sendNewsletterConfirmation(email, token, type);
      
      if (!emailSent) {
        res.status(500).json({ 
          success: false, 
          message: 'Fehler beim Senden der Bestätigungs-E-Mail' 
        });
        return;
      }
      
      res.status(200).json({ 
        success: true, 
        message: 'Bitte bestätigen Sie Ihre E-Mail-Adresse' 
      });
      return;
    }
    
    // Neuen Newsletter-Benutzer erstellen (kein vollständiger Account)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 Stunden gültig
    
    const newUser = new User({
      isFullAccount: false,
      kontakt: {
        name: name || 'Newsletter-Abonnent',
        email: email,
        newslettertype: type,
        mailNewsletter: true,
        newsletterConfirmed: false,
        confirmationToken: token,
        tokenExpires: tokenExpires,
        status: 'pending'
      }
    });
    
    await newUser.save();
    
    // Bestätigungs-E-Mail senden
    const emailSent = await sendNewsletterConfirmation(email, token, type);
    
    if (!emailSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Senden der Bestätigungs-E-Mail' 
      });
      return;
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Bitte bestätigen Sie Ihre E-Mail-Adresse' 
    });
  } catch (err) {
    console.error('Fehler bei der Newsletter-Anmeldung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Newsletter-Anmeldung bestätigen
export const confirmNewsletter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    
    if (!token) {
      res.status(400).json({ success: false, message: 'Token ist erforderlich' });
      return;
    }
    
    const user = await User.findOne({ 
      'kontakt.confirmationToken': token,
      'kontakt.tokenExpires': { $gt: new Date() }
    });
    
    if (!user) {
      res.status(400).json({ 
        success: false, 
        message: 'Ungültiger oder abgelaufener Bestätigungs-Link' 
      });
      return;
    }
    
    // Newsletter-Anmeldung bestätigen
    user.kontakt.newsletterConfirmed = true;
    user.kontakt.status = 'aktiv';
    user.kontakt.confirmationToken = null;
    user.kontakt.tokenExpires = null;
    
    await user.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Newsletter-Anmeldung erfolgreich bestätigt' 
    });
  } catch (err) {
    console.error('Fehler bei der Bestätigung der Newsletter-Anmeldung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Newsletter-Abmeldung
export const unsubscribeNewsletter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ success: false, message: 'E-Mail-Adresse ist erforderlich' });
      return;
    }
    
    const user = await User.findOne({ 'kontakt.email': email });
    
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'Kein Benutzer mit dieser E-Mail-Adresse gefunden' 
      });
      return;
    }
    
    // Newsletter-Einstellungen aktualisieren
    user.kontakt.mailNewsletter = false;
    user.kontakt.newsletterConfirmed = false;
    
    await user.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Sie wurden erfolgreich vom Newsletter abgemeldet' 
    });
  } catch (err) {
    console.error('Fehler bei der Newsletter-Abmeldung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};