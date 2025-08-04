/**
 * @file Vendor Authentication controller for the housnkuh marketplace application
 * @description Comprehensive vendor authentication and registration management
 * Handles pre-registration, trial activation, booking management, and vendor profile operations
 */

import { Request, Response } from 'express';
import User from '../models/User';
import Vertrag from '../models/Vertrag';
import { Tag } from '../models/Tag';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import config from '../config/config';
import { sendPreRegistrationConfirmation, sendTrialActivationEmail, sendCancellationConfirmationEmail, sendBookingConfirmation } from '../utils/emailService';
import Settings from '../models/Settings';
import mongoose from 'mongoose';
import { BookingStatus } from '../types/modelTypes';
import logger from '../utils/logger';

/**
 * Pre-registration for vendors before store opening
 * @description Handles vendor pre-registration with complete profile data validation and email confirmation
 * @param req - Express request object with vendor registration data
 * @param res - Express response object with registration confirmation
 * @returns Promise<void> - Resolves with success status or error message
 * @complexity O(1) - Single database operation with email sending
 */
export const preRegisterVendor = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Fehler bei der Pre-Registrierung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Registrierung für Direktvermarkter mit Package-Buchung
export const registerVendorWithBooking = async (req: Request, res: Response): Promise<void> => {
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
        user.registrationStatus = 'trial_active';
        user.trialStartDate = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        user.trialEndDate = trialEndDate;
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
        trialStartDate: isStoreOpen ? new Date() : undefined,
        trialEndDate: isStoreOpen ? (() => {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);
          return endDate;
        })() : undefined,
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
    logger.error('Fehler bei der Vendor-Registrierung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Login für Direktvermarkter
export const loginVendor = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Login-Fehler:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler bei der Anmeldung' 
    });
  }
};

// E-Mail-Bestätigung für Direktvermarkter
export const confirmVendorEmail = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Fehler bei der E-Mail-Bestätigung:', err);
    securityLogger.logEmailConfirmation(req, req.params.token || 'unknown', false, undefined, { 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Buchung nach E-Mail-Bestätigung abschließen
export const completeBooking = async (req: Request, res: Response): Promise<void> => {
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
    const { createVertragFromPendingBooking } = require('./vertragController');
    
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
    logger.error('Fehler beim Abschließen der Buchung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Vendor Profile abrufen
export const getVendorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user?.id;
    
    // Sicherstellen, dass der User nur sein eigenes Profil abruft
    if (userId !== requestingUserId) {
      res.status(403).json({ 
        success: false, 
        message: 'Zugriff verweigert' 
      });
      return;
    }
    
    const user = await User.findById(userId)
      .populate('vendorProfile.tags', 'name slug description category color icon')
      .populate('vendorProfile.businessDetails.certifications', 'name slug description category color icon')
      .populate('vendorProfile.businessDetails.productionMethods', 'name slug description category color icon');
      
    if (!user || !user.isVendor) {
      res.status(404).json({ 
        success: false, 
        message: 'Vendor nicht gefunden' 
      });
      return;
    }
    
    // Profildaten zusammenstellen
    const profileData = {
      name: user.kontakt.name,
      email: user.kontakt.email,
      telefon: user.kontakt.telefon || '',
      unternehmen: user.vendorProfile?.unternehmen || '',
      beschreibung: user.vendorProfile?.beschreibung || '',
      profilBild: user.vendorProfile?.profilBild || '',
      bannerBild: user.vendorProfile?.bannerBild || '', // Banner-Bild hinzugefügt
      adresse: user.adressen.length > 0 ? {
        strasse: user.adressen[0].strasse,
        hausnummer: user.adressen[0].hausnummer,
        plz: user.adressen[0].plz,
        ort: user.adressen[0].ort
      } : {
        strasse: '',
        hausnummer: '',
        plz: '',
        ort: ''
      },
      oeffnungszeiten: user.vendorProfile?.oeffnungszeiten || {
        montag: '',
        dienstag: '',
        mittwoch: '',
        donnerstag: '',
        freitag: '',
        samstag: '',
        sonntag: ''
      },
      // Tag-basiertes System
      tags: (user.vendorProfile as any)?.tags || [],
      businessDetails: {
        certifications: (user.vendorProfile as any)?.businessDetails?.certifications || [],
        productionMethods: (user.vendorProfile as any)?.businessDetails?.productionMethods || [],
        businessType: (user.vendorProfile as any)?.businessDetails?.businessType || 'farm',
        farmSize: (user.vendorProfile as any)?.businessDetails?.farmSize || '',
        founded: (user.vendorProfile as any)?.businessDetails?.founded || null
      },
      location: {
        coordinates: (user.vendorProfile as any)?.location?.coordinates || null,
        address: (user.vendorProfile as any)?.location?.address || '',
        deliveryRadius: (user.vendorProfile as any)?.location?.deliveryRadius || null,
        deliveryAreas: (user.vendorProfile as any)?.location?.deliveryAreas || []
      },
      operationalInfo: {
        seasonal: (user.vendorProfile as any)?.operationalInfo?.seasonal || false,
        yearRoundOperation: (user.vendorProfile as any)?.operationalInfo?.yearRoundOperation || true,
        peakSeason: (user.vendorProfile as any)?.operationalInfo?.peakSeason || null
      },
      
      slogan: user.vendorProfile?.slogan || '',
      website: user.vendorProfile?.website || '',
      socialMedia: user.vendorProfile?.socialMedia || {
        facebook: '',
        instagram: ''
      },
      verifyStatus: user.vendorProfile?.verifyStatus || 'unverified'
    };
    
    res.json({ 
      success: true, 
      profile: profileData 
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen des Vendor-Profils:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Vendor Profile aktualisieren
export const updateVendorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user?.id;
    
    // Sicherstellen, dass der User nur sein eigenes Profil bearbeitet
    if (userId !== requestingUserId) {
      res.status(403).json({ 
        success: false, 
        message: 'Zugriff verweigert' 
      });
      return;
    }
    
    const {
      name,
      telefon,
      unternehmen,
      beschreibung,
      profilBild,
      bannerBild,
      adresse,
      oeffnungszeiten,
      tags, // Array von Tag IDs oder Namen
      businessDetails,
      location,
      operationalInfo,
      slogan,
      website,
      socialMedia
    } = req.body;
    
    const user = await User.findById(userId);
    if (!user || !user.isVendor) {
      res.status(404).json({ 
        success: false, 
        message: 'Vendor nicht gefunden' 
      });
      return;
    }
    
    // Kontaktdaten aktualisieren
    if (name) user.kontakt.name = name;
    if (telefon !== undefined) user.kontakt.telefon = telefon;
    
    // Adresse aktualisieren
    if (adresse) {
      if (user.adressen.length > 0) {
        // Erste Adresse aktualisieren
        user.adressen[0].strasse = adresse.strasse || user.adressen[0].strasse;
        user.adressen[0].hausnummer = adresse.hausnummer || user.adressen[0].hausnummer;
        user.adressen[0].plz = adresse.plz || user.adressen[0].plz;
        user.adressen[0].ort = adresse.ort || user.adressen[0].ort;
      } else {
        // Neue Adresse hinzufügen
        user.adressen.push({
          adresstyp: 'Hauptadresse',
          strasse: adresse.strasse,
          hausnummer: adresse.hausnummer,
          plz: adresse.plz,
          ort: adresse.ort,
          name1: user.kontakt.name,
          email: user.kontakt.email
        } as any);
      }
    }
    
    // Vendor-spezifische Profildaten aktualisieren
    if (!user.vendorProfile) {
      user.vendorProfile = {} as any;
    }
    
    const vendorProfile = user.vendorProfile!;
    
    if (unternehmen !== undefined) vendorProfile.unternehmen = unternehmen;
    if (beschreibung !== undefined) vendorProfile.beschreibung = beschreibung;
    if (profilBild !== undefined) vendorProfile.profilBild = profilBild;
    if (bannerBild !== undefined) vendorProfile.bannerBild = bannerBild;
    if (oeffnungszeiten) vendorProfile.oeffnungszeiten = oeffnungszeiten;
    
    // Tag-System
    if (tags !== undefined) {
      const tagIds: mongoose.Types.ObjectId[] = [];
      
      for (const tagIdentifier of tags) {
        if (typeof tagIdentifier === 'string') {
          if (mongoose.Types.ObjectId.isValid(tagIdentifier)) {
            // Direkte ObjectId
            tagIds.push(new mongoose.Types.ObjectId(tagIdentifier));
          } else {
            // Tag-Name oder Slug - erstelle oder finde Tag
            const tag = await Tag.findOrCreateTags([tagIdentifier], 'product');
            if (tag && tag.length > 0) {
              tagIds.push(tag[0]._id);
            }
          }
        } else if (tagIdentifier && typeof tagIdentifier === 'object' && tagIdentifier._id) {
          // Tag-Objekt mit _id - extrahiere die ID
          const id = tagIdentifier._id || tagIdentifier.id;
          if (mongoose.Types.ObjectId.isValid(id)) {
            tagIds.push(new mongoose.Types.ObjectId(id));
          }
        }
      }
      
      (vendorProfile as any).tags = tagIds;
    }
    
    // Business Details aktualisieren
    if (businessDetails) {
      if (!(vendorProfile as any).businessDetails) {
        (vendorProfile as any).businessDetails = {};
      }
      
      const businessDetailsObj = (vendorProfile as any).businessDetails;
      
      if (businessDetails.founded !== undefined) {
        businessDetailsObj.founded = businessDetails.founded;
      }
      if (businessDetails.farmSize !== undefined) {
        businessDetailsObj.farmSize = businessDetails.farmSize;
      }
      if (businessDetails.businessType !== undefined) {
        businessDetailsObj.businessType = businessDetails.businessType;
      }
      
      // Zertifizierungen als Tags
      if (businessDetails.certifications) {
        const certificationIds: mongoose.Types.ObjectId[] = [];
        const certificationTags = await Tag.findOrCreateTags(businessDetails.certifications, 'certification');
        certificationTags.forEach(tag => certificationIds.push(tag._id));
        businessDetailsObj.certifications = certificationIds;
      }
      
      // Produktionsmethoden als Tags
      if (businessDetails.productionMethods) {
        const methodIds: mongoose.Types.ObjectId[] = [];
        const methodTags = await Tag.findOrCreateTags(businessDetails.productionMethods, 'method');
        methodTags.forEach(tag => methodIds.push(tag._id));
        businessDetailsObj.productionMethods = methodIds;
      }
    }
    
    // Location Details aktualisieren
    if (location) {
      if (!(vendorProfile as any).location) {
        (vendorProfile as any).location = {};
      }
      
      const locationObj = (vendorProfile as any).location;
      
      if (location.coordinates !== undefined) {
        locationObj.coordinates = location.coordinates;
      }
      if (location.address !== undefined) {
        locationObj.address = location.address;
      }
      if (location.deliveryRadius !== undefined) {
        locationObj.deliveryRadius = location.deliveryRadius;
      }
      if (location.deliveryAreas !== undefined) {
        locationObj.deliveryAreas = location.deliveryAreas;
      }
    }
    
    // Operational Info aktualisieren
    if (operationalInfo) {
      if (!(vendorProfile as any).operationalInfo) {
        (vendorProfile as any).operationalInfo = {};
      }
      
      const operationalObj = (vendorProfile as any).operationalInfo;
      
      if (operationalInfo.seasonal !== undefined) {
        operationalObj.seasonal = operationalInfo.seasonal;
      }
      if (operationalInfo.yearRoundOperation !== undefined) {
        operationalObj.yearRoundOperation = operationalInfo.yearRoundOperation;
      }
      if (operationalInfo.peakSeason !== undefined) {
        operationalObj.peakSeason = operationalInfo.peakSeason;
      }
    }
    
    if (slogan !== undefined) vendorProfile.slogan = slogan;
    if (website !== undefined) vendorProfile.website = website;
    if (socialMedia) vendorProfile.socialMedia = socialMedia;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Profil erfolgreich aktualisiert' 
    });
  } catch (err) {
    logger.error('Fehler beim Aktualisieren des Vendor-Profils:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Multer-Konfiguration für Bild-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/vendor-images');
    
    // Sicherstellen, dass das Upload-Verzeichnis existiert
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Eindeutigen Dateinamen generieren
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `vendor-${uniqueSuffix}${fileExtension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB Limit
  },
  fileFilter: (req, file, cb) => {
    // Nur Bilder erlauben
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  }
});

// Bild-Upload für Vendor-Profile (Profil- und Banner-Bilder)
export const uploadVendorImage = async (req: Request, res: Response): Promise<void> => {
  try {
    // Multer-Middleware manuell aufrufen
    upload.single('image')(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ 
              success: false, 
              message: 'Datei ist zu groß. Maximum 5MB erlaubt.' 
            });
            return;
          }
        }
        res.status(400).json({ 
          success: false, 
          message: err.message || 'Fehler beim Upload' 
        });
        return;
      }
      
      if (!req.file) {
        res.status(400).json({ 
          success: false, 
          message: 'Keine Datei hochgeladen' 
        });
        return;
      }
      
      // URL für das hochgeladene Bild erstellen
      const imageUrl = `/uploads/vendor-images/${req.file.filename}`;
      
      res.json({ 
        success: true, 
        imageUrl,
        message: 'Bild erfolgreich hochgeladen' 
      });
    });
  } catch (err) {
    logger.error('Fehler beim Bild-Upload:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Alle Vendor-Profile für die öffentliche Übersicht abrufen mit erweiterten Filteroptionen
export const getAllVendorProfiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      tags, // Tag-basierte Filterung
      standorte,
      verifyStatus,
      registrationStatus,
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Base query - nur aktive, bestätigte und öffentlich sichtbare Vendors
    const baseQuery: any = {
      isVendor: true,
      isFullAccount: true,
      'kontakt.status': 'aktiv',
      'kontakt.newsletterConfirmed': true,
      isPubliclyVisible: true
    };

    // Search filter - Tag-basiertes System
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      
      // Finde Tags, die zum Suchbegriff passen
      const matchingTags = await Tag.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ],
        isActive: true
      }).select('_id');
      
      const tagIds = matchingTags.map(tag => tag._id);
      
      baseQuery.$or = [
        { 'kontakt.name': searchRegex },
        { 'vendorProfile.unternehmen': searchRegex },
        { 'vendorProfile.beschreibung': searchRegex },
        { 'vendorProfile.tags': { $in: tagIds } } // Tag-basierte Suche
      ];
    }

    // Tag-basierte Filterung
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      const validTagIds: mongoose.Types.ObjectId[] = [];
      
      for (const tagIdentifier of tagsArray) {
        if (typeof tagIdentifier === 'string' && tagIdentifier.trim()) {
          // Versuche als ObjectId
          if (mongoose.Types.ObjectId.isValid(tagIdentifier)) {
            validTagIds.push(new mongoose.Types.ObjectId(tagIdentifier));
          } else {
            // Versuche als Tag-Name oder Slug
            const tag = await Tag.findOne({
              $or: [
                { slug: tagIdentifier.trim() },
                { name: tagIdentifier.trim() }
              ],
              isActive: true
            });
            if (tag) {
              validTagIds.push(tag._id);
            }
          }
        }
      }
      
      if (validTagIds.length > 0) {
        baseQuery['vendorProfile.tags'] = { $in: validTagIds };
      }
    }

    // Standorte filter (basierend auf Vendor-Adresse)
    if (standorte) {
      const standorteArray = Array.isArray(standorte) ? standorte : [standorte];
      const validStandorte = standorteArray.filter(ort => typeof ort === 'string' && ort.trim());
      
      if (validStandorte.length > 0) {
        baseQuery['adressen.ort'] = { $in: validStandorte };
      }
    }

    // Verify Status filter
    if (verifyStatus && typeof verifyStatus === 'string') {
      const validVerifyStatuses = ['verified', 'pending', 'unverified'];
      if (validVerifyStatuses.includes(verifyStatus)) {
        baseQuery['vendorProfile.verifyStatus'] = verifyStatus;
      }
    }

    // Registration Status filter (für Trial-Status etc.)
    if (registrationStatus && typeof registrationStatus === 'string') {
      const validRegistrationStatuses = ['trial_active', 'active', 'preregistered'];
      if (validRegistrationStatuses.includes(registrationStatus)) {
        baseQuery.registrationStatus = registrationStatus;
      }
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortOptions: any = {};
    const validSortFields = ['name', 'unternehmen', 'registrationDate', 'verifyStatus'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'name';
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    if (sortField === 'name') {
      sortOptions['kontakt.name'] = sortDirection;
    } else if (sortField === 'unternehmen') {
      sortOptions['vendorProfile.unternehmen'] = sortDirection;
    } else if (sortField === 'registrationDate') {
      sortOptions['registrationDate'] = sortDirection;
    } else if (sortField === 'verifyStatus') {
      sortOptions['vendorProfile.verifyStatus'] = sortDirection;
    }

    // Execute query with pagination and populate tags
    const [vendors, totalCount] = await Promise.all([
      User.find(baseQuery)
        .select('kontakt vendorProfile adressen createdAt isPubliclyVisible registrationStatus registrationDate')
        .populate('vendorProfile.tags', 'name slug description category color icon')
        .populate('vendorProfile.businessDetails.certifications', 'name slug description category color icon')
        .populate('vendorProfile.businessDetails.productionMethods', 'name slug description category color icon')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(baseQuery)
    ]);

    // Verfügbare Filter-Optionen für Frontend ermitteln
    const [allVendors, allTags] = await Promise.all([
      User.find({
        isVendor: true,
        isFullAccount: true,
        'kontakt.status': 'aktiv',
        'kontakt.newsletterConfirmed': true,
        isPubliclyVisible: true
      }).select('vendorProfile.tags adressen.ort vendorProfile.verifyStatus registrationStatus')
        .populate('vendorProfile.tags', 'name slug category')
        .lean(),
      Tag.find({ isActive: true, category: 'product' }).select('name slug category').lean()
    ]);

    // Sammle alle verwendeten Tags
    const usedTags = new Set();
    allVendors.forEach(vendor => {
      if (vendor.vendorProfile?.tags) {
        vendor.vendorProfile.tags.forEach((tag: any) => {
          if (tag && tag.name) {
            usedTags.add(JSON.stringify({
              id: tag._id,
              name: tag.name,
              slug: tag.slug,
              category: tag.category
            }));
          }
        });
      }
    });

    const availableFilters = {
      // Tag-basierte Filter
      tags: Array.from(usedTags).map(tagStr => JSON.parse(tagStr as string)),
      allTags: allTags.map(tag => ({
        id: tag._id,
        name: tag.name,
        slug: tag.slug,
        category: tag.category
      })),
      
      standorte: [...new Set(allVendors.flatMap(v => v.adressen?.map(a => a.ort) || []))].filter(Boolean).sort(),
      verifyStatuses: [...new Set(allVendors.map(v => v.vendorProfile?.verifyStatus || 'unverified'))].sort(),
      registrationStatuses: [...new Set(allVendors.map(v => v.registrationStatus))].filter(Boolean).sort()
    };
    
    // Vendor-Daten für die öffentliche Anzeige formatieren
    const publicVendorData = vendors.map(vendor => ({
      id: vendor._id?.toString() || '',
      name: vendor.kontakt.name,
      unternehmen: vendor.vendorProfile?.unternehmen || '',
      beschreibung: vendor.vendorProfile?.beschreibung || '',
      profilBild: vendor.vendorProfile?.profilBild || '',
      bannerBild: vendor.vendorProfile?.bannerBild || '',
      telefon: vendor.kontakt.telefon || '',
      email: vendor.kontakt.email,
      adresse: vendor.adressen && vendor.adressen.length > 0 ? {
        strasse: vendor.adressen[0].strasse,
        hausnummer: vendor.adressen[0].hausnummer,
        plz: vendor.adressen[0].plz,
        ort: vendor.adressen[0].ort
      } : {
        strasse: '',
        hausnummer: '',
        plz: '',
        ort: ''
      },
      
      // Tag-basiertes System
      tags: vendor.vendorProfile?.tags || [],
      businessDetails: {
        certifications: vendor.vendorProfile?.businessDetails?.certifications || [],
        productionMethods: vendor.vendorProfile?.businessDetails?.productionMethods || [],
        businessType: vendor.vendorProfile?.businessDetails?.businessType || 'farm',
        farmSize: vendor.vendorProfile?.businessDetails?.farmSize || '',
        founded: vendor.vendorProfile?.businessDetails?.founded || null
      },
      location: {
        coordinates: vendor.vendorProfile?.location?.coordinates || null,
        address: vendor.vendorProfile?.location?.address || '',
        deliveryRadius: vendor.vendorProfile?.location?.deliveryRadius || null,
        deliveryAreas: vendor.vendorProfile?.location?.deliveryAreas || []
      },
      
      slogan: vendor.vendorProfile?.slogan || '',
      website: vendor.vendorProfile?.website || '',
      socialMedia: vendor.vendorProfile?.socialMedia || {
        facebook: '',
        instagram: ''
      },
      oeffnungszeiten: vendor.vendorProfile?.oeffnungszeiten || {},
      verifyStatus: vendor.vendorProfile?.verifyStatus || 'unverified',
      registrationStatus: vendor.registrationStatus,
      registrationDate: vendor.registrationDate,
      // TODO: Mietfächer werden später hinzugefügt, wenn die Vertragslogik fertig ist
      mietfaecher: []
    }));

    res.json({ 
      success: true, 
      vendors: publicVendorData,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1
      },
      availableFilters
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen der Vendor-Profile:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Einzelnes Vendor-Profil für die öffentliche Anzeige abrufen
export const getPublicVendorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId } = req.params;
    
    if (!vendorId) {
      res.status(400).json({ 
        success: false, 
        message: 'Vendor-ID ist erforderlich' 
      });
      return;
    }
    
    // Vendor suchen (nur aktive, bestätigte und öffentlich sichtbare)
    const vendor = await User.findOne({
      _id: vendorId,
      isVendor: true,
      isFullAccount: true,
      'kontakt.status': 'aktiv',
      'kontakt.newsletterConfirmed': true,
      isPubliclyVisible: true  // Filter für öffentliche Sichtbarkeit
    }).select('kontakt vendorProfile adressen createdAt isPubliclyVisible')
      .populate('vendorProfile.tags', 'name slug description category color icon');
    
    if (!vendor) {
      res.status(404).json({ 
        success: false, 
        message: 'Direktvermarkter nicht gefunden' 
      });
      return;
    }
    
    // Vendor-Daten für die öffentliche Anzeige formatieren
    const publicVendorData = {
      id: vendor._id?.toString() || '',
      name: vendor.kontakt.name,
      unternehmen: vendor.vendorProfile?.unternehmen || '',
      beschreibung: vendor.vendorProfile?.beschreibung || '',
      profilBild: vendor.vendorProfile?.profilBild || '',
      bannerBild: vendor.vendorProfile?.bannerBild || '', // Banner-Bild hinzugefügt
      telefon: vendor.kontakt.telefon || '',
      email: vendor.kontakt.email,
      adresse: vendor.adressen.length > 0 ? {
        strasse: vendor.adressen[0].strasse,
        hausnummer: vendor.adressen[0].hausnummer,
        plz: vendor.adressen[0].plz,
        ort: vendor.adressen[0].ort
      } : {
        strasse: '',
        hausnummer: '',
        plz: '',
        ort: ''
      },
      oeffnungszeiten: vendor.vendorProfile?.oeffnungszeiten || {
        montag: '',
        dienstag: '',
        mittwoch: '',
        donnerstag: '',
        freitag: '',
        samstag: '',
        sonntag: ''
      },
      // Tag-basiertes System
      tags: (vendor.vendorProfile as any)?.tags || [],
      slogan: vendor.vendorProfile?.slogan || '',
      website: vendor.vendorProfile?.website || '',
      socialMedia: vendor.vendorProfile?.socialMedia || {
        facebook: '',
        instagram: ''
      },
      verifyStatus: vendor.vendorProfile?.verifyStatus || 'unverified',
      // TODO: Mietfächer werden später hinzugefügt, wenn die Vertragslogik fertig ist
      mietfaecher: []
    };
    
    res.json({ 
      success: true, 
      vendor: publicVendorData 
    });
  } catch (err) {
    logger.error('Fehler beim Abrufen des Vendor-Profils:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Vendor Verträge abrufen
export const getVendorContracts = async (req: Request, res: Response): Promise<void> => {
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
                 logger.error("Fehler beim Abrufen der Vendor-Verträge:", error);
                 res.status(500).json({ error: "Fehler beim Abrufen der Verträge" });
               }
             };
;

// Cancel vendor trial/subscription
export const cancelVendorSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    // Verify the user is cancelling their own subscription
    if ((req as any).user?.id !== userId) {
      res.status(403).json({ 
        success: false, 
        message: "Keine Berechtigung" 
      });
      return;
    }
    
    // Find the vendor
    const user = await User.findById(userId);
    if (!user || !user.isVendor) {
      res.status(404).json({ 
        success: false, 
        message: "Vendor nicht gefunden" 
      });
      return;
    }
    
    // Check current registration status
    if (user.registrationStatus === 'cancelled') {
      res.status(400).json({ 
        success: false, 
        message: "Account ist bereits gekündigt" 
      });
      return;
    }
    
    // Update registration status to cancelled
    user.registrationStatus = 'cancelled';
    user.isPubliclyVisible = false; // Hide from public listings
    
    // Log cancellation reason if provided
    if (reason) {
      logger.info('Vendor cancelled subscription:', { email: user.kontakt.email, reason });
    }
    
    await user.save();
    
    // Send cancellation confirmation email
    try {
      const { sendCancellationConfirmationEmail } = require('../utils/emailService');
      await sendCancellationConfirmationEmail(
        user.kontakt.email,
        user.kontakt.name,
        user.trialEndDate
      );
    } catch (emailError) {
      logger.error('Failed to send cancellation confirmation email:', emailError);
      // Continue even if email fails
    }
    
    res.json({ 
      success: true, 
      message: "Deine Registrierung wurde erfolgreich gekündigt. Du kannst dich jederzeit wieder anmelden."
    });
    
  } catch (error) {
    logger.error("Fehler beim Kündigen der Vendor-Registrierung:", error);
    res.status(500).json({ 
      success: false, 
      message: "Ein Serverfehler ist aufgetreten" 
    });
  }
};

// Tag erstellen (für Vendors)
export const createVendorTag = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('=== CREATE VENDOR TAG REQUEST ===');
    logger.debug('Request body:', { body: req.body });
    logger.debug('User from token:', { user: (req as any).user });
    
    const { name, description, category = 'product', icon, color } = req.body;
    const vendorId = (req as any).user?.id;
    
    logger.debug('Extracted data:', { name, description, category, icon, color, vendorId });
    
    if (!name || !name.trim()) {
      logger.error('Error: Tag name is missing');
      res.status(400).json({
        success: false,
        message: 'Tag-Name ist erforderlich'
      });
      return;
    }
    
    if (!vendorId) {
      logger.error('Error: Vendor ID is missing');
      res.status(401).json({
        success: false,
        message: 'Vendor-Authentifizierung fehlgeschlagen'
      });
      return;
    }
    
    // Vendor-Info für bessere Beschreibung
    logger.debug('Finding vendor with ID:', { vendorId });
    const vendor = await User.findById(vendorId).select('kontakt.name');
    const vendorName = vendor?.kontakt?.name || 'Unbekannter Vendor';
    logger.debug('Found vendor:', { vendorName });
    
    // Prüfen ob Tag bereits existiert
    logger.debug('Checking for existing tag:', { name: name.trim(), category });
    const existingTag = await Tag.findOne({
      name: name.trim(),
      category: category
    });
    
    if (existingTag) {
      logger.warn('Tag already exists:', { existingTag });
      res.status(200).json({
        success: true,
        tag: existingTag,
        message: `Tag "${name}" existiert bereits und wurde zu Ihrem Profil hinzugefügt`
      });
      return;
    }
    
    // Neuen Tag erstellen
    logger.info('Creating new tag...');
    
    // Generate slug manually for safety
    const slug = name.trim()
      .toLowerCase()
      .replace(/[äöüß]/g, (match: string) => {
        const replacements: { [key: string]: string } = {
          'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss'
        };
        return replacements[match] || match;
      })
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const newTag = new Tag({
      name: name.trim(),
      slug: slug,
      category: category,
      description: description || `Von ${vendorName} erstellt`,
      icon: icon || undefined,
      color: color || '#6B7280',
      isActive: true // Vendor-erstellte Tags sind sofort aktiv
    });
    
    logger.debug('Saving new tag:', { newTag });
    await newTag.save();
    
    logger.info('New tag created successfully by vendor:', { vendorName, tagName: newTag.name });
    
    res.status(201).json({
      success: true,
      tag: newTag,
      message: `Tag "${newTag.name}" wurde erfolgreich erstellt`
    });
    
  } catch (err) {
    logger.error('Fehler beim Erstellen des Vendor-Tags:', err);
    
    // Spezifische MongoDB Fehler
    if (err instanceof Error && err.message.includes('E11000')) {
      res.status(400).json({
        success: false,
        message: 'Ein Tag mit diesem Namen existiert bereits'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: `Serverfehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
    });
  }
};

// Interface für AuthRequest
interface AuthRequest extends Request {
  user?: { id: string; isAdmin?: boolean; isVendor?: boolean; email?: string };
}

// Zusätzliche Buchung für authentifizierte Vendors
export const additionalBooking = async (req: AuthRequest, res: Response): Promise<void> => {
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
Zusatzleistungen: ${zusatzleistungen ? Object.entries(zusatzleistungen).filter(([key, value]) => value).map(([key]) => key).join(', ') : 'Keine'}
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
    logger.error('Additional booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process additional booking'
    });
  }
};

// M005 Implementation: Get vendor bookings with status
export const getVendorBookings = async (req: AuthRequest, res: Response): Promise<void> => {
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
    logger.error('Error getting vendor bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Buchungen'
    });
  }
};

// M005 Implementation: Get specific vendor booking by ID
export const getVendorBookingById = async (req: AuthRequest, res: Response): Promise<void> => {
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
    logger.error('Error getting vendor booking by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Buchung'
    });
  }
};

// M005 Implementation: Get dashboard messages for vendor
export const getDashboardMessages = async (req: AuthRequest, res: Response): Promise<void> => {
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
    logger.error('Error getting dashboard messages:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Dashboard-Nachrichten'
    });
  }
};

// M005 Implementation: Dismiss dashboard message
export const dismissDashboardMessage = async (req: AuthRequest, res: Response): Promise<void> => {
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
    logger.error('Error dismissing dashboard message:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ausblenden der Nachricht'
    });
  }
};

// M006 S004 Implementation: Get trial status and trial bookings
export const getTrialStatus = async (req: AuthRequest, res: Response): Promise<void> => {
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
    logger.error('Error getting trial status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Probemonat-Status'
    });
  }
};

// M006 S004 Implementation: Cancel trial booking
export const cancelTrialBooking = async (req: AuthRequest, res: Response): Promise<void> => {
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
    logger.error('Error cancelling trial booking:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Stornieren der Trial-Buchung'
    });
  }
};

// M006 S004 Implementation: Confirm trial booking
export const confirmTrialBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { mietfachId, startdatum, istProbemonatBuchung } = req.body;

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
    logger.error('Error confirming trial booking:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Buchungsbestätigung'
    });
  }
};
