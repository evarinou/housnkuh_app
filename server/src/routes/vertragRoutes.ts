import { Router } from 'express';
import * as vertragController from '../controllers/vertragController';
import { auth } from '../middleware/auth';

const router = Router();

// Alle Verträge abrufen (nur für Admins)
router.get('/', auth, vertragController.getAllVertraege);

// Verträge nach Benutzer abrufen
router.get('/user/:userId', auth, vertragController.getVertraegeByUser);

// Einzelnen Vertrag abrufen
router.get('/:id', auth, vertragController.getVertragById);

// Neuen Vertrag erstellen
router.post('/', auth, vertragController.createVertrag);

// Vertrag aktualisieren
router.put('/:id', auth, vertragController.updateVertrag);

// Service zu Vertrag hinzufügen
router.post('/:id/services', auth, vertragController.addServiceToVertrag);

// Vertrag löschen
router.delete('/:id', auth, vertragController.deleteVertrag);

export default router;