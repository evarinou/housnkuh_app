// server/src/middleware/auth.ts - Erweitern für Vendor-Auth
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';

// Interface für Request mit user-Eigenschaft erweitern
interface AuthRequest extends Request {
  user?: { id: string; isAdmin?: boolean; isVendor?: boolean; email?: string };
}

// Standard-Authentifizierung
export const auth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Token aus Header holen
  const token = req.header('x-auth-token');

  // Prüfen, ob Token existiert
  if (!token) {
    res.status(401).json({ message: 'Kein Token, Autorisierung verweigert' });
    return;
  }

  try {
    // Token verifizieren
    const decoded = jwt.verify(token, config.jwtSecret) as { 
      id: string; 
      isAdmin?: boolean; 
      isVendor?: boolean; 
      email?: string; 
    };
    
    // User an Request anhängen
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token ist ungültig' });
  }
};

// Admin-Authentifizierung
export const adminAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Token aus Authorization Header holen (Bearer-Format) oder x-auth-token
  const authHeader = req.header('Authorization');
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;
  const xAuthToken = req.header('x-auth-token');
  const token = bearerToken || xAuthToken;

  // Prüfen, ob Token existiert
  if (!token) {
    res.status(401).json({ message: 'Kein Token, Autorisierung verweigert' });
    return;
  }

  try {
    // Token verifizieren
    const decoded = jwt.verify(token, config.jwtSecret) as { 
      id: string; 
      isAdmin?: boolean; 
      isVendor?: boolean; 
      email?: string; 
    };
    
    // Prüfe, ob Benutzer Admin ist
    if (decoded.isAdmin !== true) {
      res.status(403).json({ message: 'Zugriff verweigert. Admin-Rechte erforderlich.' });
      return;
    }
    
    // User an Request anhängen
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token ist ungültig' });
  }
};

// Vendor-Authentifizierung
export const vendorAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Token aus Authorization Header holen (Bearer-Format)
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;

  if (!token) {
    res.status(401).json({ 
      success: false, 
      message: 'Kein Token, Autorisierung verweigert' 
    });
    return;
  }

  try {
    // Token verifizieren
    const decoded = jwt.verify(token, config.jwtSecret) as { 
      id: string; 
      isVendor?: boolean; 
      email?: string; 
    };
    
    // Prüfe, ob es ein Vendor-Token ist
    if (!decoded.isVendor) {
      res.status(403).json({ 
        success: false, 
        message: 'Zugriff nur für Direktvermarkter' 
      });
      return;
    }
    
    // User an Request anhängen
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ 
      success: false, 
      message: 'Token ist ungültig' 
    });
  }
};