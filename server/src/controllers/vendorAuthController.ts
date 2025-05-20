// server/src/controllers/vendorAuthController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/config';
import { sendVendorWelcomeEmail } from '../utils/emailService';

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
    
    const user = await User.findOne({ 
      'kontakt.confirmationToken': token,
      'kontakt.tokenExpires': { $gt: new Date() },
      isVendor: true
    });
    
    if (!user) {
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
    
    // Hier würde die Vertragserstellung stattfinden
    // TODO: Vertrag aus pendingBooking-Daten erstellen
    
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