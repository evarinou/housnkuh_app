import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import connectDB from './config/db';
import routes from './routes';
import ScheduledJobs from './services/scheduledJobs';

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

// Statische Dateien für Uploads bereitstellen
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API-Routen
app.use('/api', routes);

// Basis-Route zum Testen
app.get('/', (req, res) => {
  res.json({ message: 'Willkommen bei der housnkuh API!' });
});

// Initialize scheduled jobs after DB connection
mongoose.connection.once('open', () => {
  console.log('✅ MongoDB connected');
  
  // Initialize trial system scheduled jobs
  try {
    ScheduledJobs.initialize();
    console.log('✅ Trial system scheduled jobs initialized');
  } catch (error) {
    console.error('❌ Failed to initialize scheduled jobs:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, stopping scheduled jobs...');
  ScheduledJobs.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, stopping scheduled jobs...');
  ScheduledJobs.stopAll();
  process.exit(0);
});

// Server starten
const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT} auf allen Interfaces`);
});