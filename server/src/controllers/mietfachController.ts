/**
 * @file Mietfach controller for the housnkuh marketplace application
 * @description Rental unit management controller with availability checking and contract integration
 * Handles all Mietfach operations including availability queries, contract management, and pricing
 */

import { Request, Response } from 'express';
import Mietfach from '../models/Mietfach';
import Vertrag from '../models/Vertrag';
import { IMietfach, IVertrag, IService } from '../types/modelTypes';
import logger from '../utils/logger';

/**
 * Retrieves all rental units (Mietfächer)
 * @description Fetches all Mietfächer from the database for admin overview
 * @param req - Express request object
 * @param res - Express response object with Mietfächer data
 * @returns Promise<void> - Resolves with complete Mietfächer list or error message
 * @complexity O(n) where n is the number of Mietfächer
 */
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
                 // Use aggregation pipeline to avoid N+1 queries
                 const mietfaecherWithContracts = await Mietfach.aggregate([
                   {
                     $lookup: {
                       from: 'vertraege',
                       let: { mietfachId: '$_id' },
                       pipeline: [
                         {
                           $match: {
                             $expr: {
                               $in: ['$$mietfachId', '$services.mietfach']
                             }
                           }
                         },
                         {
                           $lookup: {
                             from: 'users',
                             localField: 'user',
                             foreignField: '_id',
                             as: 'user',
                             pipeline: [
                               {
                                 $project: {
                                   username: 1,
                                   'kontakt.name': 1,
                                   'kontakt.email': 1
                                 }
                               }
                             ]
                           }
                         },
                         { $unwind: '$user' },
                         { $sort: { datum: -1 } }
                       ],
                       as: 'vertraege'
                     }
                   },
                   {
                     $addFields: {
                       belegungen: {
                         $reduce: {
                           input: '$vertraege',
                           initialValue: [],
                           in: {
                             $concatArrays: [
                               '$$value',
                               {
                                 $map: {
                                   input: {
                                     $filter: {
                                       input: '$$this.services',
                                       cond: { $eq: ['$$this.mietfach', '$_id'] }
                                     }
                                   },
                                   as: 'service',
                                   in: {
                                     vertragId: '$$this._id',
                                     user: '$$this.user',
                                     mietbeginn: '$$service.mietbeginn',
                                     mietende: '$$service.mietende',
                                     monatspreis: '$$service.monatspreis',
                                     status: {
                                       $cond: {
                                         if: {
                                           $or: [
                                             { $eq: ['$$service.mietende', null] },
                                             { $gt: ['$$service.mietende', new Date()] }
                                           ]
                                         },
                                         then: 'aktiv',
                                         else: 'beendet'
                                       }
                                     }
                                   }
                                 }
                               }
                             ]
                           }
                         }
                       }
                     }
                   },
                   {
                     $addFields: {
                       istBelegt: {
                         $anyElementTrue: {
                           $map: {
                             input: '$belegungen',
                             as: 'belegung',
                             in: { $eq: ['$$belegung.status', 'aktiv'] }
                           }
                         }
                       }
                     }
                   },
                   {
                     $project: {
                       vertraege: 0 // Remove the intermediate vertraege field
                     }
                   }
                 ]);
                 
                 res.json(mietfaecherWithContracts);
               } catch (err) {
                 logger.error('Fehler beim Abrufen der Mietfächer mit Verträgen:', err);
                 res.status(500).json({ message: 'Serverfehler beim Abrufen der Mietfächer' });
               }
             };
;

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