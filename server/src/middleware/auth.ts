// server/src/middleware/auth.ts - Erweitern für Admin-Prüfung
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';

// Interface für Request mit user-Eigenschaft erweitern
interface AuthRequest extends Request {
  user?: { id: string; isAdmin?: boolean };
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
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; isAdmin?: boolean };
    
    // User an Request anhängen
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token ist ungültig' });
  }
};

// Admin-Authentifizierung
export const adminAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  auth(req, res, () => {
    // Prüfe, ob Benutzer Admin ist
    if (req.user?.isAdmin !== true) {
      return res.status(403).json({ message: 'Zugriff verweigert. Admin-Rechte erforderlich.' });
    }
    
    next();
  });
};