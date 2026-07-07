/**
 * @file Vendor Authentication controller for the housnkuh marketplace application
 * @description Comprehensive vendor authentication and registration management
 * Handles pre-registration, trial activation, booking management, and vendor profile operations
 */

import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/config';
import { sendPreRegistrationConfirmation, sendTrialActivationEmail, sendBookingConfirmation, sendCustomEmail } from '../utils/emailService';
import Settings from '../models/Settings';
import { BookingStatus } from '../types/modelTypes';
import { syncVendorToFlourio } from '../services/flourio/services/businessPartnerSyncService';
import logger from '../utils/logger';
import AppError from '../utils/AppError';

/**
 * Pre-registration for vendors before store opening
 * @description Handles vendor pre-registration with complete profile data validation and email confirmation
 * @param req - Express request object with vendor registration data
 * @param res - Express response object with registration confirmation
 * @returns Promise<void> - Resolves with success status or error message
 * @complexity O(1) - Single database operation with email sending
 */
export const preRegisterVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      // Persönliche Daten
      email,
      password,
      name,
      telefon,
      
      // Adressdaten
      strasse,
      hausnummer,
      plz,
      ort,
      
      // Unternehmensdaten (optional)
      unternehmen,
      beschreibung
    } = req.body;
    
    logger.info('Pre-Registration Anfrage erhalten:', { email, name, unternehmen });
    
    // Validierung der Pflichtfelder
    if (!email || !password || !name || !strasse || !hausnummer || !plz || !ort) {
      res.status(400).json({ 
        success: false, 
        message: 'Alle Pflichtfelder müssen ausgefüllt werden' 
      });
      return;
    }
    
    // Store Opening Status prüfen
    const settings = await Settings.getSettings();
    if (settings.isStoreOpen()) {
      res.status(400).json({ 
        success: false, 
        message: 'Der Store ist bereits eröffnet. Bitte nutze die reguläre Registrierung.' 
      });
      return;
    }
    
    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ 
        success: false, 
        message: 'Bitte gib eine gültige E-Mail-Adresse ein' 
      });
      return;
    }
    
    // Prüfen, ob E-Mail bereits existiert
    const existingUser = await User.findOne({ 'kontakt.email': email });
    if (existingUser && existingUser.isFullAccount) {
      res.status(400).json({ 
        success: false, 
        message: 'Ein Account mit dieser E-Mail existiert bereits.' 
      });
      return;
    }
    
    // Passwort hashen
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Username generieren
    const username = email;
    
    // Pre-Registration User erstellen
    const newUser = new User({
      username,
      password: hashedPassword,
      isFullAccount: true,
      isVendor: true,
      registrationStatus: 'preregistered', // Explizit als pre-registered markieren
      registrationDate: new Date(),
      isPubliclyVisible: false, // Nicht öffentlich sichtbar bis manuell freigeschaltet
      provisionssatz: 7, // Default to Premium model (7%) for new vendors
      modelltyp: 'Premium',
      
      kontakt: {
        name,
        email,
        telefon,
        newslettertype: 'vendor',
        mailNewsletter: true,
        status: 'aktiv'
      },
      
      adressen: [{
        adresstyp: 'Hauptadresse',
        strasse,
        hausnummer,
        plz,
        ort,
        name1: name
      }],
      
      vendorProfile: {
        unternehmen,
        beschreibung,
        verifyStatus: 'unverified'
      }
    });
    
    const savedUser = await newUser.save();
    logger.info('Pre-Registration erfolgreich:', { userId: savedUser._id });

    // flour.io-BusinessPartner nicht-blockierend anlegen (Registrierung nie daran scheitern lassen)
    void syncVendorToFlourio(String(savedUser._id)).catch(err =>
      logger.error('[preRegister] flour.io BusinessPartner-Sync fehlgeschlagen', {
        vendorId: String(savedUser._id), error: err.message
      })
    );
    
    // Eröffnungsdatum für Response vorbereiten
    const openingInfo = settings.storeOpening.enabled && settings.storeOpening.openingDate 
      ? { 
          openingDate: settings.storeOpening.openingDate,
          daysUntilOpening: Math.ceil((settings.storeOpening.openingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        }
      : null;
    
    // Send pre-registration confirmation email
    try {
      await sendPreRegistrationConfirmation(email, {
        name,
        openingDate: settings.storeOpening.openingDate
      });
      logger.info('Pre-registration confirmation email sent successfully');
    } catch (emailError) {
      logger.error('Failed to send pre-registration confirmation email:', emailError);
      // Continue with registration even if email fails
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Pre-Registrierung erfolgreich! Dein kostenloser Probemonat startet automatisch mit der Store-Eröffnung.',
      userId: savedUser._id,
      status: 'preregistered',
      openingInfo
    });
    
  } catch (err) {
    next(new AppError('Ein Serverfehler ist aufgetreten', 500, err));
  }
};

// Registrierung für Direktvermarkter mit Package-Buchung
export const registerVendorWithBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    logger.info('=== VENDOR REGISTRATION WITH BOOKING START ===');
    logger.debug('Request body keys:', { keys: Object.keys(req.body) });
    logger.debug('Package data present:', { present: !!req.body.packageData });
    if (req.body.packageData) {
      logger.debug('Package data keys:', { keys: Object.keys(req.body.packageData) });
      logger.debug('Full package data:', { packageData: req.body.packageData });
      logger.debug('Discount value in packageData:', { discount: req.body.packageData?.discount });
      logger.debug('Rental duration:', { duration: req.body.packageData?.rentalDuration });
    }
    
    const {
      // Persönliche Daten
      email,
      password,
      name,
      telefon,
      
      // Adressdaten
      strasse,
      hausnummer,
      plz,
      ort,
      
      // Package-Daten
      packageData,
      comments,
      
      // Unternehmensdaten (optional)
      unternehmen
    } = req.body;
    
    // Import validation utilities
    const { validateEmail, validatePackageData, validateComment } = require('../utils/validation');
    
    // Validierung
    if (!email || !password || !name || !strasse || !hausnummer || !plz || !ort || !packageData) {
      res.status(400).json({ 
        success: false, 
        message: 'Alle Pflichtfelder müssen ausgefüllt werden' 
      });
      return;
    }
    
    // E-Mail validation
    if (!validateEmail(email)) {
      res.status(400).json({ 
        success: false, 
        message: 'Bitte gib eine gültige E-Mail-Adresse ein' 
      });
      return;
    }
    
    // Package data validation
    const packageValidation = validatePackageData(packageData);
    if (!packageValidation.isValid) {
      res.status(400).json({ 
        success: false, 
        message: packageValidation.message 
      });
      return;
    }
    
    // Comments validation
    const commentValidation = validateComment(comments);
    if (!commentValidation.isValid) {
      res.status(400).json({ 
        success: false, 
        message: commentValidation.message 
      });
      return;
    }
    
    // Use sanitized comments
    const sanitizedComments = commentValidation.sanitizedComment;
    
    // Prüfen, ob E-Mail bereits existiert
    const existingUser = await User.findOne({ 'kontakt.email': email });
    if (existingUser && existingUser.isFullAccount) {
      res.status(400).json({ 
        success: false, 
        message: 'Ein vollständiger Account mit dieser E-Mail existiert bereits. Bitte melde dich an.' 
      });
      return;
    }
    
    // Passwort hashen
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Username generieren (falls nicht angegeben)
    const username = email; // Oder eine andere Logik für Username-Generierung
    
    // Token für E-Mail-Bestätigung generieren
    const emailConfirmationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 Stunden gültig
    
    // Check if store is open to determine registration status
    const settings = await Settings.getSettings();
    const isStoreOpen = settings.isStoreOpen();
    
    // User erstellen oder aktualisieren
    let user;
    if (existingUser && !existingUser.isFullAccount) {
      // Existierenden Newsletter-Account zu vollständigem Account erweitern
      logger.info('Erweiterung eines bestehenden Newsletter-Accounts zu einem Vendor-Account:', { userId: existingUser._id });
      
      user = existingUser;
      user.username = username;
      user.password = hashedPassword;
      user.isFullAccount = true;
      user.isVendor = true;
      user.email = email;
      
      // Set registration status based on store status
      if (isStoreOpen) {
        const { calculateTrialPeriod } = require('../services/trialService');
        const { start, end } = calculateTrialPeriod(new Date());
        user.registrationStatus = 'trial_active';
        user.trialStartDate = start;
        user.trialEndDate = end;
      } else {
        user.registrationStatus = 'preregistered';
      }
      user.registrationDate = new Date();
      
      // Aktualisiere den Kontakt mit neuen Daten, aber behalte vorhandene Newsletter-Einstellungen bei
      const existingNewsletterConfirmed = user.kontakt.newsletterConfirmed;
      
      user.kontakt = {
        ...user.kontakt,
        name,
        email,
        telefon,
        newslettertype: 'vendor',
        confirmationToken: emailConfirmationToken,
        tokenExpires,
        status: BookingStatus.PENDING,
        // Newsletter-Status beibehalten, falls bereits bestätigt
        newsletterConfirmed: existingNewsletterConfirmed
      };
      
      // Adresse hinzufügen
      user.adressen = [
        {
          adresstyp: 'Hauptadresse',
          strasse,
          hausnummer,
          plz,
          ort,
          telefon,
          email,
          name1: name,
          name2: unternehmen || ''
        }
      ];
      
      // Vendor Profile initialisieren falls nicht vorhanden
      if (!user.vendorProfile) {
        user.vendorProfile = {
          unternehmen: unternehmen || '',
          verifyStatus: 'unverified'
        };
      }
      
      // Buchung hinzufügen
      logger.info('Adding pendingBooking to existing user');
      user.pendingBooking = {
        packageData,
        comments: sanitizedComments,
        createdAt: new Date(),
        requestedAt: new Date(),
        status: BookingStatus.PENDING
      };
    } else {
      // Neuen Account erstellen
      logger.info('Erstellen eines neuen Vendor-Accounts');
      
      user = new User({
        username,
        password: hashedPassword,
        email,
        isFullAccount: true,
        isVendor: true,
        registrationStatus: isStoreOpen ? 'trial_active' : 'preregistered',
        registrationDate: new Date(),
        ...(isStoreOpen ? (() => {
          const { calculateTrialPeriod } = require('../services/trialService');
          const { start, end } = calculateTrialPeriod(new Date());
          return { trialStartDate: start, trialEndDate: end };
        })() : {}),
        kontakt: {
          name,
          email,
          telefon,
          mailNewsletter: true,
          newslettertype: 'vendor',
          newsletterConfirmed: false,
          confirmationToken: emailConfirmationToken,
          tokenExpires,
          status: 'pending'
        },
        adressen: [
          {
            adresstyp: 'Hauptadresse',
            strasse,
            hausnummer,
            plz,
            ort,
            telefon,
            email,
            name1: name,
            name2: unternehmen || ''
          }
        ],
        vendorProfile: {
          unternehmen: unternehmen || '',
          verifyStatus: 'unverified'
        },
        pendingBooking: {
          packageData,
          comments: sanitizedComments,
          createdAt: new Date(),
          status: 'pending'
        }
      });
    }
    
    const savedUser = await user.save();

    logger.info('User saved successfully:', { userId: savedUser._id });
    logger.info('User pendingBooking status:', { status: savedUser.pendingBooking?.status });

    // flour.io-BusinessPartner nicht-blockierend anlegen (Registrierung nie daran scheitern lassen)
    void syncVendorToFlourio(String(savedUser._id)).catch(err =>
      logger.error('[register] flour.io BusinessPartner-Sync fehlgeschlagen', {
        vendorId: String(savedUser._id), error: err.message
      })
    );
    logger.info('User isVendor:', { isVendor: savedUser.isVendor });
    
    // Buchungsbestätigungs-E-Mail senden (mit Package-Details und Bestätigungslink)
    logger.info('Sending booking confirmation email with package details to:', { email });
    logger.debug('Email token:', { token: emailConfirmationToken });
    logger.debug('Package data for email:', { packageData });
    
    const bookingEmailSent = await sendBookingConfirmation({
      vendorName: name,
      email: email,
      confirmationToken: emailConfirmationToken,
      packageData: packageData,
      zusatzleistungen: packageData.zusatzleistungen ? {
        lagerservice: packageData.zusatzleistungen.lagerservice || false,
        versandservice: packageData.zusatzleistungen.versandservice || false,
        lagerservice_kosten: packageData.zusatzleistungen.lagerservice ? 20 : 0,
        versandservice_kosten: packageData.zusatzleistungen.versandservice ? 5 : 0
      } : undefined
    });
    
    if (!bookingEmailSent) {
      logger.error('Failed to send booking confirmation email');
      res.status(201).json({ 
        success: true, 
        message: 'Account erstellt, aber E-Mail konnte nicht gesendet werden. Bitte kontaktiere den Support.',
        userId: user._id,
        emailWarning: true
      });
      return;
    }
    
    logger.info('Booking confirmation email sent successfully');
    
    res.status(201).json({ 
      success: true, 
      message: 'Account erstellt. Bitte bestätige deine E-Mail-Adresse.',
      userId: user._id 
    });
  } catch (err) {
    next(new AppError('Ein Serverfehler ist aufgetreten', 500, err));
  }
};

// Login für Direktvermarkter
export const loginVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ 
        success: false, 
        message: 'E-Mail und Passwort sind erforderlich' 
      });
      return;
    }
    
    // User suchen
    const user = await User.findOne({ 
      'kontakt.email': email,
      isFullAccount: true,
      isVendor: true
    });
    
    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'Ungültige Anmeldedaten' 
      });
      return;
    }
    
    // Check if email is confirmed
    if (!user.kontakt.newsletterConfirmed || user.kontakt.status !== 'aktiv') {
      res.status(401).json({ 
        success: false, 
        message: 'Bitte bestätige zuerst deine E-Mail-Adresse, bevor du dich anmeldest' 
      });
      return;
    }
    
    // Passwort prüfen
    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      res.status(401).json({ 
        success: false, 
        message: 'Ungültige Anmeldedaten' 
      });
      return;
    }
    
    // JWT Token erstellen
    const token = jwt.sign(
      { 
        id: user._id, 
        isVendor: user.isVendor,
        email: user.kontakt.email 
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.kontakt.name,
        email: user.kontakt.email,
        isVendor: user.isVendor,
        hasPendingBooking: !!user.pendingBooking,
        registrationStatus: user.registrationStatus,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate
      }
    });
  } catch (err) {
    next(new AppError('Serverfehler bei der Anmeldung', 500, err));
  }
};

// E-Mail-Bestätigung für Direktvermarkter
export const confirmVendorEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const securityLogger = require('../utils/securityLogger').default;
  
  try {
    const { token } = req.params;
    
    // Input validation - token should be validated by middleware
    if (!token || typeof token !== 'string') {
      securityLogger.logInvalidToken(req, 'email_confirmation', token || 'empty');
      res.status(400).json({ 
        success: false, 
        message: 'Ungültiger Bestätigungs-Link' 
      });
      return;
    }
    
    logger.info('Confirming vendor email with token:', { tokenPrefix: token.substring(0, 8) + '...' });
    
    // Find user with valid token - no fallback logic for security
    const user = await User.findOne({ 
      'kontakt.confirmationToken': token,
      'kontakt.tokenExpires': { $gt: new Date() },
      isVendor: true
    });
    
    if (!user) {
      // Check if token exists but is expired
      const expiredTokenUser = await User.findOne({
        'kontakt.confirmationToken': token,
        isVendor: true
      });
      
      if (expiredTokenUser) {
        securityLogger.logTokenExpired(req, 'email_confirmation', String(expiredTokenUser._id));
        res.status(400).json({ 
          success: false, 
          message: 'Bestätigungs-Link ist abgelaufen. Bitte registrieren Sie sich erneut.' 
        });
        return;
      }
      
      // Token doesn't exist - could be already used or invalid
      // Check if there are any confirmed users (since tokens are cleared after use)
      const anyConfirmedUser = await User.findOne({
        'kontakt.newsletterConfirmed': true,
        'kontakt.status': 'aktiv',
        isVendor: true
      });
      
      if (anyConfirmedUser) {
        // If there are confirmed users, this token was likely already used
        securityLogger.logEmailConfirmation(req, token, true, 'unknown', { 
          reason: 'token_already_used',
          message: 'Token not found - likely already used'
        });
        res.status(200).json({ 
          success: true, 
          message: 'E-Mail-Adresse bereits bestätigt',
          alreadyConfirmed: true
        });
        return;
      }
      
      // No confirmed users exist, so this is truly an invalid token
      securityLogger.logInvalidToken(req, 'email_confirmation', token);
      res.status(400).json({ 
        success: false, 
        message: 'Ungültiger oder abgelaufener Bestätigungs-Link' 
      });
      return;
    }
    
    // Check if user is already confirmed
    if (user.kontakt.newsletterConfirmed && user.kontakt.status === 'aktiv') {
      securityLogger.logEmailConfirmation(req, token, true, String(user._id), { 
        reason: 'already_confirmed',
        email: user.kontakt.email 
      });
      res.status(200).json({ 
        success: true, 
        message: 'E-Mail-Adresse bereits bestätigt',
        alreadyConfirmed: true,
        userId: user._id,
        vendor: {
          packageData: user.pendingBooking?.packageData || null
        }
      });
      return;
    }
    
    // E-Mail bestätigen und Account aktivieren
    user.kontakt.newsletterConfirmed = true;
    user.kontakt.status = 'aktiv';
    user.kontakt.confirmationToken = null;
    user.kontakt.tokenExpires = null;
    
    await user.save();
    
    // Log successful email confirmation
    securityLogger.logEmailConfirmation(req, token, true, String(user._id), { 
      email: user.kontakt.email,
      previousStatus: user.kontakt.status 
    });
    
    // Do NOT create contract here - wait for admin to assign Mietfächer
    // This ensures the booking appears in admin dashboard as "Ausstehende Buchungen"
    if (user.pendingBooking && user.pendingBooking.packageData) {
      logger.info('User has pending booking - waiting for admin to assign Mietfächer');
    }
    
    // If user is in trial status and store is open, send trial activation email
    if (user.registrationStatus === 'trial_active' && user.trialStartDate && user.trialEndDate) {
      await sendTrialActivationEmail(
        user.kontakt.email,
        user.kontakt.name,
        user.trialStartDate,
        user.trialEndDate
      );
    }
    
    // Calculate correct pricing using the universal PriceCalculationService
    let correctedPackageData = null;
    if (user.pendingBooking?.packageData) {
      try {
        const { PriceCalculationService } = require('../services/priceCalculationService');
        const packageData = user.pendingBooking.packageData;
        
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
        correctedPackageData = {
          ...packageData,
          totalCost: {
            ...packageData.totalCost,
            monthly: priceBreakdown.monthlyTotal,
            packageCosts: priceBreakdown.packageCosts,
            zusatzleistungenCosts: priceBreakdown.zusatzleistungenCosts,
            subtotal: priceBreakdown.subtotal,
            discountAmount: priceBreakdown.discountAmount,
            discount: priceBreakdown.discount / 100, // Convert back to decimal for frontend
            provision: packageData.selectedProvisionType === 'premium' ? 7 : 4
          }
        };
      } catch (calculationError) {
        logger.error('Error calculating price for vendor confirmation:', calculationError);
        // Use original data if calculation fails
        correctedPackageData = user.pendingBooking.packageData;
      }
    }

    res.json({ 
      success: true, 
      message: 'E-Mail-Adresse erfolgreich bestätigt. Du kannst dich jetzt anmelden.',
      userId: user._id,
      vendor: {
        packageData: correctedPackageData
      }
    });
  } catch (err) {
    securityLogger.logEmailConfirmation(req, req.params.token || 'unknown', false, undefined, {
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    next(new AppError('Ein Serverfehler ist aufgetreten', 500, err));
  }
};

// Passwort ändern (authentifizierter Vendor)
export const changeVendorPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Aktuelles und neues Passwort sind erforderlich'
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Das neue Passwort muss mindestens 8 Zeichen lang sein'
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password!);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Das aktuelle Passwort ist nicht korrekt'
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    logger.info('Vendor password changed successfully', { userId });
    res.json({ success: true, message: 'Passwort erfolgreich geändert' });
  } catch (err) {
    next(new AppError('Serverfehler beim Passwort-Ändern', 500, err));
  }
};

// Passwort-Reset anfordern (öffentlich)
export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const securityLogger = require('../utils/securityLogger').default;

  try {
    const { email } = req.body;

    // Immer 200 zurückgeben (Security: kein User-Enumeration)
    const successMessage = 'Falls ein Account mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.';

    if (!email) {
      res.status(400).json({ success: false, message: 'E-Mail-Adresse ist erforderlich' });
      return;
    }

    const user = await User.findOne({
      'kontakt.email': email,
      isFullAccount: true,
      isVendor: true
    });

    if (!user) {
      // Kein User verraten — gleiche Response
      securityLogger.logPasswordReset(req, email, false, { reason: 'user_not_found' });
      res.json({ success: true, message: successMessage });
      return;
    }

    // Token generieren
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 Stunde gültig

    user.kontakt.passwordResetToken = resetToken;
    user.kontakt.passwordResetExpires = resetExpires;
    await user.save();

    // Reset-E-Mail senden
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/vendor/reset-password?token=${resetToken}`;

    await sendCustomEmail({
      to: email,
      subject: 'housnkuh – Passwort zurücksetzen',
      html: `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          <h2 style="color: #09122c; text-align: center;">Passwort zurücksetzen</h2>
          <p style="color: #333; line-height: 1.6;">Hallo ${user.kontakt.name},</p>
          <p style="color: #333; line-height: 1.6;">
            du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den folgenden Link, um ein neues Passwort festzulegen:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #09122c; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">
              Neues Passwort festlegen
            </a>
          </div>
          <p style="color: #999; font-size: 14px; line-height: 1.6;">
            Dieser Link ist <strong>1 Stunde</strong> gültig. Falls du keine Passwort-Zurücksetzung angefordert hast, kannst du diese E-Mail ignorieren.
          </p>
        </div>
      </div>
      `
    });

    securityLogger.logPasswordReset(req, email, true, { reason: 'reset_email_sent' });
    res.json({ success: true, message: successMessage });
  } catch (err) {
    next(new AppError('Serverfehler', 500, err));
  }
};

// Passwort zurücksetzen mit Token (öffentlich)
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const securityLogger = require('../utils/securityLogger').default;

  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ success: false, message: 'Token und neues Passwort sind erforderlich' });
      return;
    }

    const user = await User.findOne({
      'kontakt.passwordResetToken': token,
      'kontakt.passwordResetExpires': { $gt: new Date() },
      isVendor: true
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Ungültiger oder abgelaufener Reset-Link. Bitte fordere einen neuen an.'
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.kontakt.passwordResetToken = null;
    user.kontakt.passwordResetExpires = null;
    await user.save();

    securityLogger.logPasswordReset(req, user.kontakt.email, true, { reason: 'password_reset_completed' });
    logger.info('Password reset completed', { userId: user._id });

    res.json({ success: true, message: 'Passwort erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden.' });
  } catch (err) {
    next(new AppError('Serverfehler beim Passwort-Zurücksetzen', 500, err));
  }
};

// Bestätigungslink erneut senden (öffentlich)
export const resendConfirmationEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'E-Mail-Adresse ist erforderlich' });
      return;
    }

    const user = await User.findOne({
      'kontakt.email': email,
      isFullAccount: true,
      isVendor: true
    });

    if (!user) {
      // Kein User verraten
      res.json({ success: true, message: 'Falls ein Account mit dieser E-Mail existiert, wurde ein neuer Bestätigungslink gesendet.' });
      return;
    }

    if (user.kontakt.newsletterConfirmed && user.kontakt.status === 'aktiv') {
      res.json({ success: true, message: 'Deine E-Mail-Adresse ist bereits bestätigt. Du kannst dich direkt anmelden.' });
      return;
    }

    // Neuen Token generieren
    const newToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24);

    user.kontakt.confirmationToken = newToken;
    user.kontakt.tokenExpires = tokenExpires;
    await user.save();

    // Bestätigungs-E-Mail erneut senden
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/vendor/confirm/${newToken}`;

    await sendCustomEmail({
      to: email,
      subject: 'housnkuh – E-Mail-Bestätigung',
      html: `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          <h2 style="color: #09122c; text-align: center;">E-Mail bestätigen</h2>
          <p style="color: #333; line-height: 1.6;">Hallo ${user.kontakt.name},</p>
          <p style="color: #333; line-height: 1.6;">
            bitte klicke auf den folgenden Link, um deine E-Mail-Adresse zu bestätigen und deinen Account zu aktivieren:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background-color: #09122c; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">
              E-Mail bestätigen
            </a>
          </div>
          <p style="color: #999; font-size: 14px; line-height: 1.6;">
            Dieser Link ist <strong>24 Stunden</strong> gültig.
          </p>
        </div>
      </div>
      `
    });

    logger.info('Confirmation email resent', { email });
    res.json({ success: true, message: 'Ein neuer Bestätigungslink wurde gesendet. Bitte prüfe dein E-Mail-Postfach.' });
  } catch (err) {
    next(new AppError('Serverfehler', 500, err));
  }
};

// Profile management functions extracted to vendor/vendorProfileController.ts
export {
  getVendorProfile,
  updateVendorProfile,
  uploadVendorImage,
  getAllVendorProfiles,
  getPublicVendorProfile,
  cancelVendorSubscription,
  createVendorTag
} from './vendor/vendorProfileController';
