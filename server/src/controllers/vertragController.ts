// server/src/controllers/vertragController.ts
import { Request, Response } from 'express';
import Vertrag from '../models/Vertrag';

// Alle Verträge abrufen
export const getAllVertraege = async (req: Request, res: Response): Promise<void> => {
  try {
    const vertraege = await Vertrag.find()
      .populate('user', 'username kontakt.name')
      .populate('services.mietfach', 'bezeichnung typ');
    res.json({
      success: true,
      vertraege
    });
  } catch (err) {
    console.error('Fehler beim Abrufen der Verträge:', err);
    res.status(500).json({ 
      success: false,
      message: 'Serverfehler beim Abrufen der Verträge' 
    });
  }
};

// Vertrag nach ID abrufen
export const getVertragById = async (req: Request, res: Response): Promise<void> => {
  try {
    const vertrag = await Vertrag.findById(req.params.id)
      .populate('user', 'username kontakt.name adressen')
      .populate('services.mietfach', 'bezeichnung typ');
    
    if (!vertrag) {
      res.status(404).json({ 
        success: false,
        message: 'Vertrag nicht gefunden' 
      });
      return;
    }
    
    res.json({
      success: true,
      vertrag
    });
  } catch (err) {
    console.error('Fehler beim Abrufen des Vertrags:', err);
    res.status(500).json({ 
      success: false,
      message: 'Serverfehler beim Abrufen des Vertrags' 
    });
  }
};

// Neuen Vertrag erstellen
export const createVertrag = async (req: Request, res: Response): Promise<void> => {
  try {
    const newVertrag = new Vertrag(req.body);
    const savedVertrag = await newVertrag.save();
    
    // Vertrag mit Beziehungen zurückgeben
    const populatedVertrag = await Vertrag.findById(savedVertrag._id)
      .populate('user', 'username kontakt.name')
      .populate('services.mietfach', 'bezeichnung typ');
    
    res.status(201).json({
      success: true,
      vertrag: populatedVertrag
    });
  } catch (err) {
    console.error('Fehler beim Erstellen des Vertrags:', err);
    res.status(400).json({ 
      success: false,
      message: 'Fehler beim Erstellen des Vertrags' 
    });
  }
};

// Vertrag aktualisieren
export const updateVertrag = async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedVertrag = await Vertrag.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )
      .populate('user', 'username kontakt.name')
      .populate('services.mietfach', 'bezeichnung typ');
    
    if (!updatedVertrag) {
      res.status(404).json({ 
        success: false,
        message: 'Vertrag nicht gefunden' 
      });
      return;
    }
    
    res.json({
      success: true,
      vertrag: updatedVertrag
    });
  } catch (err) {
    console.error('Fehler beim Aktualisieren des Vertrags:', err);
    res.status(400).json({ 
      success: false,
      message: 'Fehler beim Aktualisieren des Vertrags' 
    });
  }
};

// Vertrag löschen
export const deleteVertrag = async (req: Request, res: Response): Promise<void> => {
  try {
    const deletedVertrag = await Vertrag.findByIdAndDelete(req.params.id);
    
    if (!deletedVertrag) {
      res.status(404).json({ 
        success: false,
        message: 'Vertrag nicht gefunden' 
      });
      return;
    }
    
    res.json({ 
      success: true,
      message: 'Vertrag erfolgreich gelöscht' 
    });
  } catch (err) {
    console.error('Fehler beim Löschen des Vertrags:', err);
    res.status(500).json({ 
      success: false,
      message: 'Serverfehler beim Löschen des Vertrags' 
    });
  }
};

// Verträge nach Benutzer abrufen
export const getVertraegeByUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const vertraege = await Vertrag.find({ user: userId })
      .populate('services.mietfach', 'bezeichnung typ');
    
    res.json({
      success: true,
      vertraege
    });
  } catch (err) {
    console.error('Fehler beim Abrufen der Verträge für den Benutzer:', err);
    res.status(500).json({ 
      success: false,
      message: 'Serverfehler beim Abrufen der Verträge für diesen Benutzer' 
    });
  }
};

// Service zu bestehendem Vertrag hinzufügen
export const addServiceToVertrag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const newService = req.body;
    
    const vertrag = await Vertrag.findById(id);
    
    if (!vertrag) {
      res.status(404).json({ 
        success: false,
        message: 'Vertrag nicht gefunden' 
      });
      return;
    }
    
    vertrag.services.push(newService);
    const updatedVertrag = await vertrag.save();
    
    // Vertrag mit Beziehungen zurückgeben
    const populatedVertrag = await Vertrag.findById(updatedVertrag._id)
      .populate('user', 'username kontakt.name')
      .populate('services.mietfach', 'bezeichnung typ');
    
    res.json({
      success: true,
      vertrag: populatedVertrag
    });
  } catch (err) {
    console.error('Fehler beim Hinzufügen des Services:', err);
    res.status(400).json({ 
      success: false,
      message: 'Fehler beim Hinzufügen des Services zum Vertrag' 
    });
  }
};

// Vertrag aus pendingBooking erstellen
export const createVertragFromPendingBooking = async (userId: string, packageData: any): Promise<boolean> => {
  try {
    // Hier würden Sie die Package-Daten in ein Vertrag-Format transformieren
    const newVertrag = new Vertrag({
      user: userId,
      datum: new Date(),
      packageConfiguration: packageData,
      totalMonthlyPrice: packageData.totalCost?.monthly || 0,
      contractDuration: packageData.rentalDuration || 3,
      discount: packageData.discount || 0,
      status: 'pending',
      services: [] // Hier würden Sie die Services aus packageData extrahieren
    });

    await newVertrag.save();
    return true;
  } catch (error) {
    console.error('Fehler beim Erstellen des Vertrags aus pendingBooking:', error);
    return false;
  }
};