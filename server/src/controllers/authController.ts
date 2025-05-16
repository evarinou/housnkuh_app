// server/src/controllers/authController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config/config';

// Admin-Login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    // Überprüfe, ob alle erforderlichen Felder vorhanden sind
    if (!username || !password) {
      res.status(400).json({ 
        success: false, 
        message: 'Benutzername und Passwort sind erforderlich' 
      });
      return;
    }
    
    // Suche Benutzer in der Datenbank
    const user = await User.findOne({ 
      username,
      isFullAccount: true, // Nur vollständige Konten können sich einloggen
      'kontakt.status': 'aktiv'
    });
    
    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'Ungültige Anmeldeinformationen' 
      });
      return;
    }
    
    // Überprüfe Passwort
    const isMatch = await bcrypt.compare(password, user.password!);
    
    if (!isMatch) {
      res.status(401).json({ 
        success: false, 
        message: 'Ungültige Anmeldeinformationen' 
      });
      return;
    }
    
    // Prüfe, ob Benutzer Admin-Rechte hat
    if (!user.isAdmin) {
      res.status(403).json({ 
        success: false, 
        message: 'Keine Administratorrechte' 
      });
      return;
    }
    
    // Erstelle JWT Token
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      config.jwtSecret,
      { expiresIn: '8h' } // Token läuft nach 8 Stunden ab
    );
    
    // Sende Token und Benutzerinformationen zurück
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.kontakt.name,
        isAdmin: user.isAdmin
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

// Admin-Account für Ersteinrichtung erstellen
export const setupAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    // Überprüfe, ob bereits ein Admin existiert
    const adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      res.status(400).json({ 
        success: false, 
        message: 'Admin-Account existiert bereits' 
      });
      return;
    }
    
    const { username, password, name, email, setupKey } = req.body;
    
    // Überprüfe den Setup-Schlüssel (sollte in der .env-Datei gespeichert sein)
    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      res.status(401).json({ 
        success: false, 
        message: 'Ungültiger Setup-Schlüssel' 
      });
      return;
    }
    
    // Überprüfe, ob alle erforderlichen Felder vorhanden sind
    if (!username || !password || !name || !email) {
      res.status(400).json({ 
        success: false, 
        message: 'Alle Felder sind erforderlich' 
      });
      return;
    }
    
    // Hash das Passwort
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Erstelle neuen Admin-Benutzer
    const newAdmin = new User({
      username,
      password: hashedPassword,
      isFullAccount: true,
      isAdmin: true,
      kontakt: {
        name,
        email,
        mailNewsletter: false,
        status: 'aktiv'
      }
    });
    
    await newAdmin.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Admin-Account erfolgreich erstellt',
      user: {
        id: newAdmin._id,
        username: newAdmin.username,
        name: newAdmin.kontakt.name
      }
    });
  } catch (err) {
    console.error('Fehler bei der Admin-Erstellung:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler bei der Admin-Erstellung' 
    });
  }
};