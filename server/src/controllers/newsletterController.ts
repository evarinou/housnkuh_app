// server/src/controllers/newsletterController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import crypto from 'crypto';
import { sendNewsletterConfirmation } from '../utils/emailService';

// Newsletter-Anmeldung mit erweiterten Logs
export const subscribeNewsletter = async (req: Request, res: Response): Promise<void> => {
  console.log('Newsletter subscription request received:', req.body);
  
  try {
    const { email, type = 'customer', name = '' } = req.body;
    
    console.log('Processing newsletter subscription for:', { email, type, name });
    
    if (!email) {
      console.log('Error: No email provided');
      res.status(400).json({ success: false, message: 'E-Mail-Adresse ist erforderlich' });
      return;
    }
    
    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Error: Invalid email format:', email);
      res.status(400).json({ success: false, message: 'Ungültige E-Mail-Adresse' });
      return;
    }
    
    console.log('Checking for existing user with email:', email);
    
    // Prüfen, ob Benutzer mit dieser E-Mail bereits existiert
    const existingUser = await User.findOne({ 'kontakt.email': email });
    
    if (existingUser) {
      console.log('Existing user found:', existingUser._id);
      
      // E-Mail existiert bereits, aktualisiere Newsletter-Einstellungen
      if (existingUser.kontakt.mailNewsletter && existingUser.kontakt.newsletterConfirmed) {
        console.log('User already subscribed and confirmed');
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
      
      console.log('Updating existing user with new token');
      
      // User aktualisieren
      existingUser.kontakt.newslettertype = type;
      existingUser.kontakt.mailNewsletter = true;
      existingUser.kontakt.newsletterConfirmed = false;
      existingUser.kontakt.confirmationToken = token;
      existingUser.kontakt.tokenExpires = tokenExpires;
      existingUser.kontakt.status = 'pending';
      
      try {
        await existingUser.save();
        console.log('User updated successfully');
      } catch (saveError) {
        console.error('Error saving existing user:', saveError);
        res.status(500).json({ 
          success: false, 
          message: 'Fehler beim Speichern der Benutzerdaten' 
        });
        return;
      }
      
      // Bestätigungs-E-Mail senden
      console.log('Attempting to send confirmation email...');
      const emailSent = await sendNewsletterConfirmation(email, token, type);
      
      if (!emailSent) {
        console.error('Failed to send confirmation email');
        res.status(500).json({ 
          success: false, 
          message: 'Fehler beim Senden der Bestätigungs-E-Mail' 
        });
        return;
      }
      
      console.log('Confirmation email sent successfully');
      res.status(200).json({ 
        success: true, 
        message: 'Bitte bestätigen Sie Ihre E-Mail-Adresse' 
      });
      return;
    }
    
    console.log('Creating new user for newsletter subscription');
    
    // Neuen Newsletter-Benutzer erstellen (kein vollständiger Account)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 Stunden gültig
    
    // Generiere eine zufällige Newsletter-ID für den Username, um Unique-Konflikte zu vermeiden
    const newsletterId = `newsletter_${crypto.randomBytes(8).toString('hex')}`;
    
    const newUser = new User({
      isFullAccount: false,
      username: newsletterId, // Eindeutiger Username für Newsletter-User
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
    
    try {
      await newUser.save();
      console.log('New user created successfully:', newUser._id);
    } catch (saveError) {
      console.error('Error saving new user:', saveError);
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Erstellen des Benutzers' 
      });
      return;
    }
    
    // Bestätigungs-E-Mail senden
    console.log('Attempting to send confirmation email to new user...');
    const emailSent = await sendNewsletterConfirmation(email, token, type);
    
    if (!emailSent) {
      console.error('Failed to send confirmation email to new user');
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Senden der Bestätigungs-E-Mail' 
      });
      return;
    }
    
    console.log('Confirmation email sent successfully to new user');
    res.status(201).json({ 
      success: true, 
      message: 'Bitte bestätigen Sie Ihre E-Mail-Adresse' 
    });
  } catch (err) {
    console.error('Unexpected error in newsletter subscription:', err);
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
    
    console.log('Confirming newsletter with token:', token);
    
    const user = await User.findOne({ 
      'kontakt.confirmationToken': token,
      'kontakt.tokenExpires': { $gt: new Date() }
    });
    
    if (!user) {
      // Im Entwicklungsmodus einen Testbenutzer finden oder erstellen
      if (process.env.NODE_ENV === 'development') {
        const testUser = await User.findOne({ 'kontakt.email': 'test@example.com' });
        
        if (testUser) {
          console.log('Development mode: Using test user for confirmation');
          testUser.kontakt.newsletterConfirmed = true;
          testUser.kontakt.status = 'aktiv';
          await testUser.save();
          
          res.status(200).json({ 
            success: true, 
            message: '[DEV] Newsletter-Anmeldung erfolgreich bestätigt' 
          });
          return;
        } else {
          console.log('Development mode: Invalid token but allowing confirmation');
          res.status(200).json({
            success: true,
            message: '[DEV] Bestätigung simuliert (ungültiger Token)'
          });
          return;
        }
      }
      
      res.status(400).json({ 
        success: false, 
        message: 'Ungültiger oder abgelaufener Bestätigungs-Link' 
      });
      return;
    }
    
    console.log('User found for confirmation:', user._id);
    
    // Newsletter-Anmeldung bestätigen
    user.kontakt.newsletterConfirmed = true;
    user.kontakt.status = 'aktiv';
    user.kontakt.confirmationToken = null;
    user.kontakt.tokenExpires = null;
    
    await user.save();
    console.log('Newsletter confirmation successful for user:', user._id);
    
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