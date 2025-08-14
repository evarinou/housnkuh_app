/**
 * @file Main server entry point for the housnkuh marketplace application
 * @description Initializes and configures the Express server with all middleware,
 * routes, database connections, and scheduled jobs for the housnkuh regional
 * marketplace platform for direct marketers (Direktvermarkter)
 */

// CRITICAL: Load environment variables FIRST, before any other imports
import path from 'path';
import dotenv from 'dotenv';

// Konfigurationsdatei laden - BEFORE any other imports
const envPath = path.join(__dirname, '../.env');

// Try loading from parent directory first
dotenv.config({ path: envPath });

// Also try from current directory as fallback
dotenv.config();

// Override with explicit connection string if needed
if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('localhost')) {
  process.env.MONGO_URI = 'mongodb://192.168.178.99:27017/housnkuh';
}

// NOW import everything else
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
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
import logger from './utils/logger';
import { 
  securityHeaders, 
  sanitizeInput, 
  requestLogger, 
  errorHandler 
} from './middleware/security';

/**
 * Express application instance
 * @description Main Express app that handles all HTTP requests for the housnkuh platform
 */
const app = express();

/**
 * Performance middleware configuration
 * @description Enables gzip compression for HTTP responses to reduce bandwidth usage
 * Compression level 6 provides optimal balance between compression ratio and CPU usage
 */
app.use(compression({
  filter: (req: any, res: any) => {
    // Skip compression if client explicitly requests uncompressed response
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Good balance between compression ratio and speed
}));

/**
 * Rate limiter for registration endpoints
 * @description Prevents abuse by limiting registration attempts to 5 per IP every 15 minutes
 * Helps protect against automated bot registrations and brute force attempts
 */
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

/**
 * General API rate limiter
 * @description Applies to all API endpoints to prevent abuse and ensure fair usage
 * Allows 1000 requests per 15 minutes per IP, only counting failed requests
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased from 100)
  message: {
    success: false,
    message: 'Zu viele API-Anfragen. Bitte versuchen Sie es später erneut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
});

/**
 * Vendor dashboard rate limiter
 * @description More lenient rate limiting for authenticated vendor operations
 * Allows 2000 requests per 15 minutes to support intensive dashboard usage
 */
const vendorDashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Allow 2000 requests per 15 minutes for vendor operations (increased from 500)
  message: {
    success: false,
    message: 'Zu viele Dashboard-Anfragen. Bitte versuchen Sie es in wenigen Minuten erneut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
});

/**
 * Basic middleware configuration
 * @description Configures JSON parsing with 10MB limit and CORS for cross-origin requests
 */
app.use(express.json({ limit: '10mb' }));

// Configure Express to trust proxy headers from Nginx
app.set('trust proxy', 1);

// Debug middleware for setup requests
app.use((req, res, next) => {
  if (req.path.includes('setup')) {
    console.log('=== SETUP REQUEST DEBUG ===');
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('=========================');
  }
  next();
});
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));

/**
 * Security middleware stack
 * @description Applies security headers, request logging, and input sanitization
 */
app.use(securityHeaders);
app.use(requestLogger);
app.use(sanitizeInput);

/**
 * Monitoring middleware stack
 * @description Performance tracking and monitoring middleware applied in specific order
 * Order is critical for proper request tracking and performance measurement
 */
app.use(performanceMiddleware); // Track all requests
app.use(monitoringMiddleware); // General monitoring
app.use(rateLimitMonitoringMiddleware); // Track request rates
app.use(performanceCheckMiddleware); // Background performance checks
app.use(cleanupMonitoringMiddleware); // Periodic cleanup

/**
 * Route-specific rate limiting configuration
 * @description Applies rate limiters to specific routes before general API limiter
 * More specific routes must be configured before general patterns
 */
app.use('/api/vendor-auth/register', registrationLimiter);
app.use('/api/vendor-auth/pre-register', registrationLimiter);

/**
 * Vendor dashboard rate limiting
 * @description Applies lenient rate limiting for authenticated vendor operations
 */
app.use('/api/vendor-auth/bookings', vendorDashboardLimiter);
app.use('/api/vendor-auth/contracts', vendorDashboardLimiter);
app.use('/api/vendor-auth/profile', vendorDashboardLimiter);
app.use('/api/vendor-auth/dashboard', vendorDashboardLimiter);
app.use('/api/vendor-contracts', vendorDashboardLimiter);

/**
 * General API rate limiting
 * @description Applies to all remaining API routes not covered by specific limiters
 */
app.use('/api', apiLimiter);

/**
 * Database connection initialization
 * @description Establishes connection to MongoDB database with proper async handling
 */
(async () => {
  try {
    await connectDB();
    logger.info('Database connection initialized');
    
    // Initialize services directly after connection (don't wait for 'open' event)
    logger.info('MongoDB connected');
    
    // Seed tags (adds missing tags, skips existing ones)
    try {
      logger.info('Checking and seeding tags...');
      const { seedTags } = await import('./utils/seedTags');
      await seedTags();
    } catch (error) {
      logger.error('Failed to seed tags', { error: error instanceof Error ? error.message : error });
    }
    
    // Initialize all scheduled jobs (including monitoring)
    try {
      await ScheduledJobs.initialize();
      logger.info('All scheduled jobs initialized (trials + monitoring)');
    } catch (error) {
      logger.error('Failed to initialize scheduled jobs', { error: error instanceof Error ? error.message : error });
    }
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
})();

/**
 * Static file serving with caching and CORS
 * @description Serves uploaded files with appropriate cache headers and CORS support
 * Files are cached for 1 day to improve performance
 */
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

/**
 * Public API endpoint caching
 * @description Applies caching headers to public API endpoints for performance
 * Content is cached for 5 minutes to balance freshness and performance
 */
app.use('/api/public', (_req, res, next) => {
  // Cache public endpoints for 5 minutes
  res.set({
    'Cache-Control': 'public, max-age=300',
    'Vary': 'Accept-Encoding'
  });
  next();
});

/**
 * Main API routes
 * @description Mounts all application routes under /api prefix
 */
app.use('/api', routes);

/**
 * Error handling middleware
 * @description Error tracking and handling middleware - must be applied after routes
 */
app.use(errorTrackingMiddleware);
app.use(errorHandler);

/**
 * Root endpoint for API health check
 * @description Basic endpoint to verify API is running
 * @returns {object} Welcome message
 */
app.get('/', (_req, res) => {
  res.json({ message: 'Willkommen bei der housnkuh API!' });
});


/**
 * Graceful shutdown handler for SIGTERM
 * @description Stops all scheduled jobs before process termination
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, stopping scheduled jobs...');
  ScheduledJobs.stopAll();
  process.exit(0);
});

/**
 * Graceful shutdown handler for SIGINT (Ctrl+C)
 * @description Stops all scheduled jobs before process termination
 */
process.on('SIGINT', () => {
  logger.info('SIGINT received, stopping scheduled jobs...');
  ScheduledJobs.stopAll();
  process.exit(0);
});

/**
 * Export Express app for testing
 * @description Allows the app to be imported for unit and integration testing
 */
export { app };

/**
 * Server startup
 * @description Starts the Express server on specified port and binds to all interfaces
 * Default port is 4000 if not specified in environment variables
 */
const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server läuft auf Port ${PORT} auf allen Interfaces`);
});