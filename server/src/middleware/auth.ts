import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';

// Interface für Request mit user-Eigenschaft erweitern
interface AuthRequest extends Request {
  user?: { id: string };
}

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
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    
    // User an Request anhängen
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token ist ungültig' });
  }
};