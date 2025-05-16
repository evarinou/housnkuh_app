import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db';
import routes from './routes';

// Konfigurationsdatei laden
dotenv.config();

// Express-App erstellen
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// MongoDB-Verbindung herstellen
connectDB();

// API-Routen
app.use('/api', routes);

// Basis-Route zum Testen
app.get('/', (req, res) => {
  res.json({ message: 'Willkommen bei der housnkuh API!' });
});

// Server starten
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});