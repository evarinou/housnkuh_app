import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Konfigurationsdatei laden
dotenv.config();

// Express-App erstellen
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Basis-Route zum Testen
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Willkommen bei der housnkuh API!' });
});

// MongoDB-Verbindung herstellen
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Mit MongoDB verbunden');
    
    // Server starten
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Server läuft auf Port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB-Verbindungsfehler:', error);
  });