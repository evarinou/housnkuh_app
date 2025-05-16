import { Request, Response } from 'express';
import User from '../models/User';

// Alle Benutzer abrufen
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Benutzer' });
  }
};

// Benutzer nach ID abrufen
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'Benutzer nicht gefunden' });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Benutzers' });
  }
};

// Neuen Benutzer erstellen
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    
    // Passwort nicht in der Antwort zurückgeben
    const userResponse = savedUser.toObject() as Omit<typeof savedUser, 'password'> & { password?: string };
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 11000) { // MongoDB Duplicate Key Error
      res.status(400).json({ message: 'Benutzername bereits vergeben' });
      return;
    }
    res.status(400).json({ message: 'Fehler beim Erstellen des Benutzers' });
  }
};

// Benutzer aktualisieren
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Passwort aus Update-Daten entfernen, falls vorhanden
    // Passwort-Updates sollten über eine separate Route erfolgen
    const updateData = { ...req.body };
    if (updateData.password) delete updateData.password;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      res.status(404).json({ message: 'Benutzer nicht gefunden' });
      return;
    }
    
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: 'Fehler beim Aktualisieren des Benutzers' });
  }
};

// Benutzer löschen
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    
    if (!deletedUser) {
      res.status(404).json({ message: 'Benutzer nicht gefunden' });
      return;
    }
    
    res.json({ message: 'Benutzer erfolgreich gelöscht' });
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Löschen des Benutzers' });
  }
};