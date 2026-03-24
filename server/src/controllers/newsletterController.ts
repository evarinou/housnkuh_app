/**
 * @file Newsletter controller for the housnkuh marketplace application
 * @description Newsletter subscription management controller with email confirmation
 * Handles newsletter subscriptions, confirmations, and unsubscriptions
 */

import { Request, Response } from 'express';
import User from '../models/User';
import crypto from 'crypto';
import { sendNewsletterConfirmation } from '../utils/emailService';
import logger from '../utils/logger';

// Newsletter-Anmeldung mit erweiterten Logs
export const subscribeNewsletter = async (req: Request, res: Response): Promise<void> => {
  logger.debug('Newsletter subscription request received', { body: req.body });
  
  try {
    const { email, type = 'customer', name = '' } = req.body;
    
    logger.debug('Processing newsletter subscription', { email, type, name });
    
    if (!email) {
      logger.warn('Newsletter subscription attempt without email');
      res.status(400).json({ success: false, message: 'E-Mail-Adresse ist erforderlich' });
      return;
    }
    
    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn('Invalid email format for newsletter subscription', { email });
      res.status(400).json({ success: false, message: 'Ungültige E-Mail-Adresse' });
      return;
    }
    
    logger.debug('Checking for existing user with email', { email });
    
    // Prüfen, ob Benutzer mit dieser E-Mail bereits existiert
    const existingUser = await User.findOne({ 'kontakt.email': email });
    
    if (existingUser) {
      logger.debug('Existing user found', { userId: existingUser._id });
      
      // E-Mail existiert bereits, aktualisiere Newsletter-Einstellungen
      if (existingUser.kontakt.mailNewsletter && existingUser.kontakt.newsletterConfirmed) {
        logger.debug('User already subscribed and confirmed');
        res.status(200).json({ 
          success: true, 
          message: 'Du bist bereits für den Newsletter angemeldet' 
        });
        return;
      }
      
      // Neuen Token für Bestätigung generieren
      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date();
      tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 Stunden gültig
      
      logger.debug('Updating existing user with new token');
      
      // User aktualisieren
      existingUser.kontakt.newslettertype = type;
      existingUser.kontakt.mailNewsletter = true;
      existingUser.kontakt.newsletterConfirmed = false;
      existingUser.kontakt.confirmationToken = token;
      existingUser.kontakt.tokenExpires = tokenExpires;
      existingUser.kontakt.status = 'pending';
      
      try {
        await existingUser.save();
        logger.debug('User updated successfully');
      } catch (saveError) {
        logger.error('Error saving existing user:', saveError);
        res.status(500).json({ 
          success: false, 
          message: 'Fehler beim Speichern der Benutzerdaten' 
        });
        return;
      }
      
      // Bestätigungs-E-Mail senden
      logger.debug('Attempting to send confirmation email');
      const emailSent = await sendNewsletterConfirmation(email, token, type);
      
      if (!emailSent) {
        logger.error('Failed to send confirmation email');
        res.status(500).json({ 
          success: false, 
          message: 'Fehler beim Senden der Bestätigungs-E-Mail' 
        });
        return;
      }
      
      logger.info('Confirmation email sent successfully');
      res.status(200).json({ 
        success: true, 
        message: 'Bitte bestätige deine E-Mail-Adresse' 
      });
      return;
    }
    
    logger.debug('Creating new user for newsletter subscription');
    
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
      logger.info('New newsletter user created successfully', { userId: newUser._id });
    } catch (saveError) {
      logger.error('Error saving new user:', saveError);
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Erstellen des Benutzers' 
      });
      return;
    }
    
    // Bestätigungs-E-Mail senden
    logger.debug('Attempting to send confirmation email to new user');
    const emailSent = await sendNewsletterConfirmation(email, token, type);
    
    if (!emailSent) {
      logger.error('Failed to send confirmation email to new user');
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Senden der Bestätigungs-E-Mail' 
      });
      return;
    }
    
    logger.info('Confirmation email sent successfully to new user');
    res.status(201).json({ 
      success: true, 
      message: 'Bitte bestätige deine E-Mail-Adresse' 
    });
  } catch (err) {
    logger.error('Unexpected error in newsletter subscription:', err);
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
    
    logger.debug('Confirming newsletter with token', { token });
    
    const user = await User.findOne({ 
      'kontakt.confirmationToken': token,
      'kontakt.tokenExpires': { $gt: new Date() }
    });
    
    if (!user) {
      // Im Entwicklungsmodus einen Testbenutzer finden oder erstellen
      if (process.env.NODE_ENV === 'development') {
        const testUser = await User.findOne({ 'kontakt.email': 'test@example.com' });
        
        if (testUser) {
          logger.debug('Development mode: Using test user for confirmation');
          testUser.kontakt.newsletterConfirmed = true;
          testUser.kontakt.status = 'aktiv';
          await testUser.save();
          
          res.status(200).json({ 
            success: true, 
            message: '[DEV] Newsletter-Anmeldung erfolgreich bestätigt' 
          });
          return;
        } else {
          logger.debug('Development mode: Invalid token but allowing confirmation');
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
    
    logger.debug('User found for confirmation', { userId: user._id });
    
    // Newsletter-Anmeldung bestätigen
    user.kontakt.newsletterConfirmed = true;
    user.kontakt.status = 'aktiv';
    user.kontakt.confirmationToken = null;
    user.kontakt.tokenExpires = null;
    
    await user.save();
    logger.info('Newsletter confirmation successful', { userId: user._id });
    
    res.status(200).json({ 
      success: true, 
      message: 'Newsletter-Anmeldung erfolgreich bestätigt' 
    });
  } catch (err) {
    logger.error('Fehler bei der Bestätigung der Newsletter-Anmeldung:', err);
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
      message: 'Du wurdest erfolgreich vom Newsletter abgemeldet' 
    });
  } catch (err) {
    logger.error('Fehler bei der Newsletter-Abmeldung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};