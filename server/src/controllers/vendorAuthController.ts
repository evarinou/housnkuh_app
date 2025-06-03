// server/src/controllers/vendorAuthController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import Vertrag from '../models/Vertrag';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import config from '../config/config';
import { sendVendorWelcomeEmail, sendPreRegistrationConfirmation } from '../utils/emailService';
import Settings from '../models/Settings';

// Pre-Registrierung für Direktvermarkter vor Store-Eröffnung (M001 R001)
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
    
    console.log('Pre-Registration Anfrage erhalten:', { email, name, unternehmen });
    
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
        message: 'Der Store ist bereits eröffnet. Bitte nutzen Sie die reguläre Registrierung.' 
      });
      return;
    }
    
    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ 
        success: false, 
        message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' 
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
    console.log('Pre-Registration erfolgreich:', savedUser._id);
    
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
      console.log('Pre-registration confirmation email sent successfully');
    } catch (emailError) {
      console.error('Failed to send pre-registration confirmation email:', emailError);
      // Continue with registration even if email fails
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Pre-Registrierung erfolgreich! Ihr kostenloser Probemonat startet automatisch mit der Store-Eröffnung.',
      userId: savedUser._id,
      status: 'preregistered',
      openingInfo
    });
    
  } catch (err) {
    console.error('Fehler bei der Pre-Registrierung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Registrierung für Direktvermarkter mit Package-Buchung
export const registerVendorWithBooking = async (req: Request, res: Response): Promise<void> => {
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
      
      // Package-Daten
      packageData,
      
      // Unternehmensdaten (optional)
      unternehmen
    } = req.body;
    
    // Validierung
    if (!email || !password || !name || !strasse || !hausnummer || !plz || !ort || !packageData) {
      res.status(400).json({ 
        success: false, 
        message: 'Alle Pflichtfelder müssen ausgefüllt werden' 
      });
      return;
    }
    
    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ 
        success: false, 
        message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' 
      });
      return;
    }
    
    // Prüfen, ob E-Mail bereits existiert
    const existingUser = await User.findOne({ 'kontakt.email': email });
    if (existingUser && existingUser.isFullAccount) {
      res.status(400).json({ 
        success: false, 
        message: 'Ein vollständiger Account mit dieser E-Mail existiert bereits. Bitte melden Sie sich an.' 
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
    
    // User erstellen oder aktualisieren
    let user;
    if (existingUser && !existingUser.isFullAccount) {
      // Existierenden Newsletter-Account zu vollständigem Account erweitern
      console.log(`Erweiterung eines bestehenden Newsletter-Accounts (${existingUser._id}) zu einem Vendor-Account`);
      
      user = existingUser;
      user.username = username;
      user.password = hashedPassword;
      user.isFullAccount = true;
      user.isVendor = true;
      
      // Aktualisiere den Kontakt mit neuen Daten, aber behalte vorhandene Newsletter-Einstellungen bei
      const existingNewsletterConfirmed = user.kontakt.newsletterConfirmed;
      
      user.kontakt = {
        ...user.kontakt,
        name,
        telefon,
        newslettertype: 'vendor',
        confirmationToken: emailConfirmationToken,
        tokenExpires,
        status: 'pending',
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
      user.pendingBooking = {
        packageData,
        createdAt: new Date(),
        status: 'pending'
      };
    } else {
      // Neuen Account erstellen
      console.log('Erstellen eines neuen Vendor-Accounts');
      
      user = new User({
        username,
        password: hashedPassword,
        isFullAccount: true,
        isVendor: true,
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
          createdAt: new Date(),
          status: 'pending'
        }
      });
    }
    
    await user.save();
    
    // Bestätigungs-E-Mail senden
    const emailSent = await sendVendorWelcomeEmail(email, emailConfirmationToken, packageData);
    
    if (!emailSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Account erstellt, aber E-Mail konnte nicht gesendet werden' 
      });
      return;
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Account erstellt. Bitte bestätigen Sie Ihre E-Mail-Adresse.',
      userId: user._id 
    });
  } catch (err) {
    console.error('Fehler bei der Vendor-Registrierung:', err);
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
        hasPendingBooking: !!user.pendingBooking
      }
    });
  } catch (err) {
    console.error('Login-Fehler:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler bei der Anmeldung' 
    });
  }
};

// E-Mail-Bestätigung für Direktvermarkter
export const confirmVendorEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    
    console.log('Confirming vendor email with token:', token);
    
    // Debug: Versuchen alle User mit Confirmation Tokens zu finden
    if (process.env.NODE_ENV === 'development') {
      const allUsersWithTokens = await User.find({
        'kontakt.confirmationToken': { $ne: null }
      }).select('_id kontakt.email kontakt.confirmationToken kontakt.tokenExpires isVendor');
      
      console.log('All users with tokens:', JSON.stringify(allUsersWithTokens, null, 2));
    }
    
    const user = await User.findOne({ 
      'kontakt.confirmationToken': token,
      'kontakt.tokenExpires': { $gt: new Date() },
      isVendor: true
    });
    
    if (!user) {
      // Im Entwicklungsmodus einen Test-Vendor finden oder einen fallback anwenden
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Token not found or expired. Using development fallback.');
        console.log('Provided token:', token);
        
        // Versuche einen Testbenutzer zu finden
        const testUser = await User.findOne({ 
          isVendor: true, 
          'kontakt.email': { $regex: /test|example/i } 
        });
        
        if (testUser) {
          console.log('Development mode: Using test vendor for confirmation:', testUser._id);
          testUser.kontakt.newsletterConfirmed = true;
          testUser.kontakt.status = 'aktiv';
          testUser.kontakt.confirmationToken = null;
          testUser.kontakt.tokenExpires = null;
          
          await testUser.save();
          
          res.status(200).json({ 
            success: true, 
            message: '[DEV] Vendor-E-Mail erfolgreich bestätigt (Test-Modus)',
            userId: testUser._id
          });
          return;
        } else {
          console.log('Development mode: No test vendor found, simulating success');
          res.status(200).json({
            success: true,
            message: '[DEV] Bestätigung simuliert (im Entwicklungsmodus)'
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
    
    // E-Mail bestätigen und Account aktivieren
    user.kontakt.newsletterConfirmed = true;
    user.kontakt.status = 'aktiv';
    user.kontakt.confirmationToken = null;
    user.kontakt.tokenExpires = null;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'E-Mail-Adresse erfolgreich bestätigt. Sie können sich jetzt anmelden.',
      userId: user._id
    });
  } catch (err) {
    console.error('Fehler bei der E-Mail-Bestätigung:', err);
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
    console.error('Fehler beim Abschließen der Buchung:', err);
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
    
    const user = await User.findById(userId);
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
      kategorien: user.vendorProfile?.kategorien || [],
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
    console.error('Fehler beim Abrufen des Vendor-Profils:', err);
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
      adresse,
      oeffnungszeiten,
      kategorien,
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
    if (oeffnungszeiten) vendorProfile.oeffnungszeiten = oeffnungszeiten;
    if (kategorien) vendorProfile.kategorien = kategorien;
    if (slogan !== undefined) vendorProfile.slogan = slogan;
    if (website !== undefined) vendorProfile.website = website;
    if (socialMedia) vendorProfile.socialMedia = socialMedia;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Profil erfolgreich aktualisiert' 
    });
  } catch (err) {
    console.error('Fehler beim Aktualisieren des Vendor-Profils:', err);
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

// Bild-Upload für Vendor-Profile
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
    console.error('Fehler beim Bild-Upload:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Ein Serverfehler ist aufgetreten' 
    });
  }
};

// Alle Vendor-Profile für die öffentliche Übersicht abrufen
export const getAllVendorProfiles = async (req: Request, res: Response): Promise<void> => {
  try {
    // Nur verifizierte, aktive und öffentlich sichtbare Vendors abrufen
    const vendors = await User.find({
      isVendor: true,
      isFullAccount: true,
      'kontakt.status': 'aktiv',
      'kontakt.newsletterConfirmed': true,
      isPubliclyVisible: true  // Filter für öffentliche Sichtbarkeit
    }).select('kontakt vendorProfile adressen createdAt isPubliclyVisible');
    
    // Vendor-Daten für die öffentliche Anzeige formatieren
    const publicVendorData = vendors.map(vendor => ({
      id: vendor._id?.toString() || '',
      name: vendor.kontakt.name,
      unternehmen: vendor.vendorProfile?.unternehmen || '',
      beschreibung: vendor.vendorProfile?.beschreibung || '',
      profilBild: vendor.vendorProfile?.profilBild || '',
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
      kategorien: vendor.vendorProfile?.kategorien || [],
      slogan: vendor.vendorProfile?.slogan || '',
      website: vendor.vendorProfile?.website || '',
      socialMedia: vendor.vendorProfile?.socialMedia || {
        facebook: '',
        instagram: ''
      },
      oeffnungszeiten: vendor.vendorProfile?.oeffnungszeiten || {},
      verifyStatus: vendor.vendorProfile?.verifyStatus || 'unverified',
      // TODO: Mietfächer werden später hinzugefügt, wenn die Vertragslogik fertig ist
      mietfaecher: []
    }));
    
    res.json({ 
      success: true, 
      vendors: publicVendorData 
    });
  } catch (err) {
    console.error('Fehler beim Abrufen der Vendor-Profile:', err);
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
    }).select('kontakt vendorProfile adressen createdAt isPubliclyVisible');
    
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
      kategorien: vendor.vendorProfile?.kategorien || [],
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
    console.error('Fehler beim Abrufen des Vendor-Profils:', err);
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
    
    // Verträge mit Mietfach-Details abrufen
    const vertraege = await Vertrag.find({ user: userId })
      .populate("services.mietfach")
      .sort({ datum: -1 });
    
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
      gesamtpreis: vertrag.services.reduce((sum: number, service: any) => sum + service.monatspreis, 0)
    }));
    
    res.json({ vertraege: formattedVertraege });
  } catch (error) {
    console.error("Fehler beim Abrufen der Vendor-Verträge:", error);
    res.status(500).json({ error: "Fehler beim Abrufen der Verträge" });
  }
};
