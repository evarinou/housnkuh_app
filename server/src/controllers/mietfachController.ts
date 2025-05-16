import { Request, Response } from 'express';
import Mietfach from '../models/Mietfach';

// Alle Mietfächer abrufen
export const getAllMietfaecher = async (req: Request, res: Response): Promise<void> => {
  try {
    const mietfaecher = await Mietfach.find();
    res.json(mietfaecher);
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Mietfächer' });
  }
};

// Mietfach nach ID abrufen
export const getMietfachById = async (req: Request, res: Response): Promise<void> => {
  try {
    const mietfach = await Mietfach.findById(req.params.id);
    if (!mietfach) {
      res.status(404).json({ message: 'Mietfach nicht gefunden' });
      return;
    }
    res.json(mietfach);
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Mietfachs' });
  }
};

// Neues Mietfach erstellen
export const createMietfach = async (req: Request, res: Response): Promise<void> => {
  try {
    const newMietfach = new Mietfach(req.body);
    const savedMietfach = await newMietfach.save();
    res.status(201).json(savedMietfach);
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 11000) { // MongoDB Duplicate Key Error
      res.status(400).json({ message: 'Mietfach mit dieser Bezeichnung existiert bereits' });
      return;
    }
    res.status(400).json({ message: 'Fehler beim Erstellen des Mietfachs' });
  }
};

// Mietfach aktualisieren
export const updateMietfach = async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedMietfach = await Mietfach.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    if (!updatedMietfach) {
      res.status(404).json({ message: 'Mietfach nicht gefunden' });
      return;
    }
    
    res.json(updatedMietfach);
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 11000) {
      res.status(400).json({ message: 'Mietfach mit dieser Bezeichnung existiert bereits' });
      return;
    }
    res.status(400).json({ message: 'Fehler beim Aktualisieren des Mietfachs' });
  }
};

// Mietfach löschen
export const deleteMietfach = async (req: Request, res: Response): Promise<void> => {
  try {
    const deletedMietfach = await Mietfach.findByIdAndDelete(req.params.id);
    
    if (!deletedMietfach) {
      res.status(404).json({ message: 'Mietfach nicht gefunden' });
      return;
    }
    
    res.json({ message: 'Mietfach erfolgreich gelöscht' });
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Löschen des Mietfachs' });
  }
};

// Mietfächer nach Typ filtern
export const getMietfaecherByTyp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { typ } = req.query;
    const mietfaecher = await Mietfach.find({ typ });
    res.json(mietfaecher);
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Filtern der Mietfächer' });
  }
};