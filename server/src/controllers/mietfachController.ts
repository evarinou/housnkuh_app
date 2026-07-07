/**
 * @file Mietfach controller for the housnkuh marketplace application
 * @description Rental unit management controller with availability checking and contract integration
 * Handles all Mietfach operations including availability queries, contract management, and pricing
 */

import { Request, Response, NextFunction } from 'express';
import Mietfach from '../models/Mietfach';
import logger from '../utils/logger';
import AppError from '../utils/AppError';

/**
 * Retrieves all rental units (Mietfächer)
 * @description Fetches all Mietfächer from the database for admin overview
 * @param req - Express request object
 * @param res - Express response object with Mietfächer data
 * @returns Promise<void> - Resolves with complete Mietfächer list or error message
 * @complexity O(n) where n is the number of Mietfächer
 */
export const getAllMietfaecher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const mietfaecher = await Mietfach.find();
    res.json(mietfaecher);
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der Mietfächer', 500, err));
  }
};

// Alle Mietfächer mit Vertragsinformationen abrufen
export const getAllMietfaecherWithContracts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const mongoose = require('mongoose');
    const Vertrag = mongoose.model('Vertrag');

    // Step 1: Get all Mietfächer
    const mietfaecher = await Mietfach.find().lean();

    // Step 2: Get all Verträge with populated user
    const vertraege = await Vertrag.find()
      .populate('user', 'username kontakt.name kontakt.email vendorProfile.unternehmen vendorProfile.modelltyp vendorProfile.provisionssatz')
      .lean();

    // Step 3: For each Mietfach, find matching Verträge
    const result = mietfaecher.map((mf: any) => {
      const belegungen: any[] = [];

      for (const vertrag of vertraege as any[]) {
        for (const service of vertrag.services || []) {
          if (String(service.mietfach) === String(mf._id)) {
            belegungen.push({
              vertragId: vertrag._id,
              user: vertrag.user,
              mietbeginn: service.mietbeginn,
              mietende: service.mietende,
              monatspreis: vertrag.totalMonthlyPrice || service.monatspreis || 0,
              discount: vertrag.discount || 0,
              status: vertrag.status,
              provisionssatz: vertrag.provisionssatz,
              modelltyp: vertrag.provisionssatz === 7 ? 'Premium' : 'Basic',
              zusatzleistungen: vertrag.zusatzleistungen || {}
            });
          }
        }
      }

      const istBelegt = belegungen.some(b => ['active', 'scheduled'].includes(b.status));

      return {
        ...mf,
        belegungen,
        istBelegt
      };
    });

    res.json(result);
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der Mietfächer', 500, err));
  }
};

// Mietfach nach ID abrufen
export const getMietfachById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const mietfach = await Mietfach.findById(req.params.id);
    if (!mietfach) {
      res.status(404).json({ message: 'Mietfach nicht gefunden' });
      return;
    }
    res.json(mietfach);
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen des Mietfachs', 500, err));
  }
};

// Neues Mietfach erstellen
export const createMietfach = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Received request to create mietfach:', req.body);
    
    // Stellen sicher, dass die Pflichtfelder vorhanden sind
    if (!req.body.bezeichnung || !req.body.typ) {
      res.status(400).json({ 
        message: 'Bezeichnung und Typ sind Pflichtfelder',
        receivedData: req.body 
      });
      return;
    }
    
    // Sprint S12_M11_Mietfaecher_Seeding_Cleanup - Add manual creation tracking
    const mietfachData = {
      ...req.body,
      creationSource: 'manual',
      createdBy: (req as any).user?.id // Admin user ID from auth middleware
    };
    
    const newMietfach = new Mietfach(mietfachData);
    logger.info('Creating new mietfach with tracking:', newMietfach);
    
    const savedMietfach = await newMietfach.save();
    logger.info('Successfully saved mietfach:', savedMietfach);
    
    res.status(201).json(savedMietfach);
  } catch (err) {
    logger.error('Error creating mietfach:', err);
    
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
export const deleteMietfach = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deletedMietfach = await Mietfach.findByIdAndDelete(req.params.id);
    
    if (!deletedMietfach) {
      res.status(404).json({ message: 'Mietfach nicht gefunden' });
      return;
    }
    
    res.json({ message: 'Mietfach erfolgreich gelöscht' });
  } catch (err) {
    next(new AppError('Serverfehler beim Löschen des Mietfachs', 500, err));
  }
};

// Mietfächer nach Typ filtern
export const getMietfaecherByTyp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { typ } = req.query;
    const mietfaecher = await Mietfach.find({ typ });
    res.json(mietfaecher);
  } catch (err) {
    next(new AppError('Serverfehler beim Filtern der Mietfächer', 500, err));
  }
};