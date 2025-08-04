/**
 * @file Authentication controller for the housnkuh marketplace application
 * @description Admin authentication controller with secure login and admin account setup
 * Handles admin login authentication, JWT token generation, and initial admin account creation
 */

import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import securityLogger from '../utils/securityLogger';

/**
 * Authenticates admin users and generates JWT tokens
 * @description Handles admin login with comprehensive security validation and logging
 * @param req - Express request object containing username and password
 * @param res - Express response object with JWT token and user data
 * @returns Promise<void> - Resolves with authentication token or error message
 * @complexity O(1) - Single database lookup with bcrypt password verification
 * @security Includes rate limiting, security logging, and privilege validation
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    // Validation is handled by middleware, but double-check for security
    if (!username || !password) {
      securityLogger.logLoginAttempt(req, username || 'unknown', false, { 
        reason: 'missing_credentials' 
      });
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
      securityLogger.logLoginAttempt(req, username, false, { 
        reason: 'user_not_found' 
      });
      res.status(401).json({ 
        success: false, 
        message: 'Ungültige Anmeldeinformationen' 
      });
      return;
    }
    
    // Überprüfe Passwort
    const isMatch = await bcrypt.compare(password, user.password!);
    
    if (!isMatch) {
      securityLogger.logLoginAttempt(req, username, false, { 
        reason: 'invalid_password',
        userId: (user._id as any).toString() 
      });
      res.status(401).json({ 
        success: false, 
        message: 'Ungültige Anmeldeinformationen' 
      });
      return;
    }
    
    // Prüfe, ob Benutzer Admin-Rechte hat
    if (!user.isAdmin) {
      securityLogger.logLoginAttempt(req, username, false, { 
        reason: 'insufficient_privileges',
        userId: (user._id as any).toString() 
      });
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
    
    // Log successful login
    securityLogger.logLoginAttempt(req, username, true, { 
      userId: (user._id as any).toString() 
    });
    
    // Sende Token und Benutzerinformationen zurück
    res.json({
      success: true,
      token,
      user: {
        id: (user._id as any),
        username: user.username,
        name: user.kontakt.name,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    console.error('Login-Fehler:', err);
    securityLogger.logLoginAttempt(req, req.body.username || 'unknown', false, { 
      reason: 'server_error',
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler bei der Anmeldung' 
    });
  }
};

/**
 * Creates initial admin account for application setup
 * @description Handles secure admin account creation with setup key validation
 * @param req - Express request object containing admin credentials and setup key
 * @param res - Express response object with creation confirmation
 * @returns Promise<void> - Resolves with admin creation success or error message
 * @complexity O(1) - Single database operation with password hashing
 * @security Requires valid setup key, prevents multiple admin creation, includes security logging
 */
export const setupAdmin = async (req: Request, res: Response): Promise<void> => {
  console.log('=== CONTROLLER REACHED ===');
  console.log('Setup request body:', JSON.stringify(req.body, null, 2));
  console.log('Email from body:', req.body.email);
  console.log('All fields:', Object.keys(req.body));
  console.log('========================');
  
  try {
    
    // Try to drop the index temporarily
    try {
      await User.collection.dropIndex('email_unique');
      console.log('Dropped email_unique index');
    } catch (indexError) {
      console.log('Could not drop index:', indexError);
    }
    
    // Überprüfe, ob bereits ein Admin existiert
    const adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      securityLogger.logAdminSetup(req, req.body.username || 'unknown', false, { 
        reason: 'admin_already_exists' 
      });
      res.status(400).json({ 
        success: false, 
        message: 'Admin-Account existiert bereits' 
      });
      return;
    }
    
    const { username, password, name, email, setupKey } = req.body;
    
    // Überprüfe den Setup-Schlüssel (sollte in der .env-Datei gespeichert sein)
    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      securityLogger.logAdminSetup(req, username || 'unknown', false, { 
        reason: 'invalid_setup_key' 
      });
      res.status(401).json({ 
        success: false, 
        message: 'Ungültiger Setup-Schlüssel' 
      });
      return;
    }
    
    // Validation is handled by middleware, but double-check for security
    if (!username || !password || !name || !email) {
      securityLogger.logAdminSetup(req, username || 'unknown', false, { 
        reason: 'missing_required_fields' 
      });
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
      email, // Set top-level email field for index
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
    
    // Log successful admin setup
    securityLogger.logAdminSetup(req, username, true, { 
      userId: (newAdmin._id as any).toString(),
      email: email 
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Admin-Account erfolgreich erstellt',
      user: {
        id: (newAdmin._id as any),
        username: newAdmin.username,
        name: newAdmin.kontakt.name
      }
    });
  } catch (err) {
    console.error('Fehler bei der Admin-Erstellung:', err);
    securityLogger.logAdminSetup(req, req.body.username || 'unknown', false, { 
      reason: 'server_error',
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler bei der Admin-Erstellung' 
    });
  }
};