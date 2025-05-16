import { Router } from 'express';
import * as vertragController from '../controllers/vertragController';
// import { auth } from '../middleware/auth'; // Wenn du Auth-Middleware verwendest

const router = Router();

// Alle Verträge abrufen
router.get('/', vertragController.getAllVertraege);

// Verträge nach Benutzer abrufen
router.get('/user/:userId', vertragController.getVertraegeByUser);

// Einzelnen Vertrag abrufen
router.get('/:id', vertragController.getVertragById);

// Neuen Vertrag erstellen
router.post('/', vertragController.createVertrag);

// Vertrag aktualisieren
router.put('/:id', vertragController.updateVertrag);

// Service zu Vertrag hinzufügen
router.post('/:id/services', vertragController.addServiceToVertrag);

// Vertrag löschen
router.delete('/:id', vertragController.deleteVertrag);

export default router;