import { Request, Response } from 'express';
import Mietfach from '../models/Mietfach';
import Vertrag from '../models/Vertrag';
import { IMietfach, IVertrag, IService } from '../types/modelTypes';

// Alle Mietfächer abrufen
export const getAllMietfaecher = async (req: Request, res: Response): Promise<void> => {
  try {
    const mietfaecher = await Mietfach.find();
    res.json(mietfaecher);
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Mietfächer' });
  }
};

// Alle Mietfächer mit Vertragsinformationen abrufen
export const getAllMietfaecherWithContracts = async (req: Request, res: Response): Promise<void> => {
  try {
    const mietfaecher = await Mietfach.find();
    
    // Für jedes Mietfach die zugehörigen Verträge finden
    const mietfaecherWithContracts = await Promise.all(
      mietfaecher.map(async (mietfach: any) => {
        // Finde alle Verträge, die dieses Mietfach enthalten
        const vertraege = await Vertrag.find({
          'services.mietfach': mietfach._id
        })
        .populate('user', 'username kontakt.name kontakt.email')
        .sort({ datum: -1 });
        
        // Extrahiere die relevanten Service-Informationen
        const belegungen = vertraege.flatMap((vertrag: any) => 
          vertrag.services
            .filter((service: IService) => service.mietfach.toString() === mietfach._id.toString())
            .map((service: IService) => ({
              vertragId: vertrag._id,
              user: vertrag.user,
              mietbeginn: service.mietbeginn,
              mietende: service.mietende,
              monatspreis: service.monatspreis,
              status: (!service.mietende || new Date(service.mietende) > new Date()) ? 'aktiv' : 'beendet'
            }))
        );
        
        return {
          ...mietfach.toObject(),
          belegungen,
          istBelegt: belegungen.some((b: any) => b.status === 'aktiv')
        };
      })
    );
    
    res.json(mietfaecherWithContracts);
  } catch (err) {
    console.error('Fehler beim Abrufen der Mietfächer mit Verträgen:', err);
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
    console.log('Received request to create mietfach:', req.body);
    
    // Stellen sicher, dass die Pflichtfelder vorhanden sind
    if (!req.body.bezeichnung || !req.body.typ) {
      res.status(400).json({ 
        message: 'Bezeichnung und Typ sind Pflichtfelder',
        receivedData: req.body 
      });
      return;
    }
    
    const newMietfach = new Mietfach(req.body);
    console.log('Creating new mietfach:', newMietfach);
    
    const savedMietfach = await newMietfach.save();
    console.log('Successfully saved mietfach:', savedMietfach);
    
    res.status(201).json(savedMietfach);
  } catch (err) {
    console.error('Error creating mietfach:', err);
    
    if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 11000) { // MongoDB Duplicate Key Error
      res.status(400).json({ 
        message: 'Mietfach mit dieser Bezeichnung existiert bereits',
        error: (err as any).message || 'Duplicate key error'
      });
      return;
    }
    
    // Detailliertere Fehlermeldung
    const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
    res.status(400).json({ 
      message: 'Fehler beim Erstellen des Mietfachs',
      error: errorMessage
    });
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