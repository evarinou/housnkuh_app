import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import connectDB from './config/db';
import routes from './routes';
import ScheduledJobs from './services/scheduledJobs';
import { performanceMiddleware } from './utils/performanceMonitor';
import { 
  monitoringMiddleware, 
  errorTrackingMiddleware, 
  performanceCheckMiddleware,
  rateLimitMonitoringMiddleware,
  cleanupMonitoringMiddleware 
} from './middleware/monitoring';

// Konfigurationsdatei laden
dotenv.config();

// Express-App erstellen
const app = express();

// Performance middleware
app.use(compression({
  filter: (req: any, res: any) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Good balance between compression ratio and speed
}));

// Rate limiting for registration endpoints
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Zu viele Registrierungsversuche. Bitte versuchen Sie es in 15 Minuten erneut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Zu viele API-Anfragen. Bitte versuchen Sie es später erneut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"], // Allow images from any source
      connectSrc: ["'self'", "https:", "http:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disable COEP to allow images
  crossOriginResourcePolicy: false // Disable CORP to allow cross-origin image loading
}));
app.use(morgan('combined'));

// Monitoring middleware (order is important)
app.use(performanceMiddleware); // Track all requests
app.use(monitoringMiddleware); // General monitoring
app.use(rateLimitMonitoringMiddleware); // Track request rates
app.use(performanceCheckMiddleware); // Background performance checks
app.use(cleanupMonitoringMiddleware); // Periodic cleanup

// Apply rate limiting
app.use('/api', apiLimiter);
app.use('/api/vendor-auth/register', registrationLimiter);
app.use('/api/vendor-auth/pre-register', registrationLimiter);

// MongoDB-Verbindung herstellen
connectDB();

// Cache headers for static assets with CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d', // Cache static uploads for 1 day
  etag: true,
  lastModified: true
}));

// Cache headers for public API endpoints
app.use('/api/public', (_req, res, next) => {
  // Cache public endpoints for 5 minutes
  res.set({
    'Cache-Control': 'public, max-age=300',
    'Vary': 'Accept-Encoding'
  });
  next();
});

// API-Routen
app.use('/api', routes);

// Error tracking middleware (should be after routes)
app.use(errorTrackingMiddleware);

// Basis-Route zum Testen
app.get('/', (_req, res) => {
  res.json({ message: 'Willkommen bei der housnkuh API!' });
});

// Initialize scheduled jobs after DB connection
mongoose.connection.once('open', async () => {
  console.log('✅ MongoDB connected');
  
  // Seed tags (adds missing tags, skips existing ones)
  try {
    console.log('📌 Checking and seeding tags...');
    const { seedTags } = await import('./utils/seedTags');
    await seedTags();
  } catch (error) {
    console.error('❌ Failed to seed tags:', error);
  }
  
  // Initialize all scheduled jobs (including monitoring)
  try {
    await ScheduledJobs.initialize();
    console.log('✅ All scheduled jobs initialized (trials + monitoring)');
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