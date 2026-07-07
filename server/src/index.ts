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
const envLocalPath = path.join(__dirname, '../.env.local');

// Load .env.local first (takes precedence)
dotenv.config({ path: envLocalPath });

// Then load .env as fallback for non-sensitive defaults
dotenv.config({ path: envPath });

// Also try from current directory as fallback
dotenv.config();

// NOW import everything else
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import connectDB from './config/db';
import {
  vendorRegistrationRateLimit,
  vendorDashboardRateLimit,
  apiRateLimit
} from './middleware/rateLimiting';
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
import { cache } from './utils/cache';
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
 * Basic middleware configuration
 * @description Configures JSON parsing with 10MB limit and CORS for cross-origin requests
 */
app.use(express.json({ limit: '10mb' }));

// Configure Express to trust proxy headers from Nginx
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
    : true,
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
app.use('/api/vendor-auth/register', vendorRegistrationRateLimit);
app.use('/api/vendor-auth/pre-register', vendorRegistrationRateLimit);

/**
 * Vendor dashboard rate limiting
 * @description Applies lenient rate limiting for authenticated vendor operations
 */
app.use('/api/vendor-auth/bookings', vendorDashboardRateLimit);
app.use('/api/vendor-auth/contracts', vendorDashboardRateLimit);
app.use('/api/vendor-auth/profile', vendorDashboardRateLimit);
app.use('/api/vendor-auth/dashboard', vendorDashboardRateLimit);
app.use('/api/vendor-contracts', vendorDashboardRateLimit);

/**
 * General API rate limiting
 * @description Applies to all remaining API routes not covered by specific limiters
 */
app.use('/api', apiRateLimit);

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
  logger.info('SIGTERM received, shutting down...');
  ScheduledJobs.stopAll();
  cache.destroy();
  process.exit(0);
});

/**
 * Graceful shutdown handler for SIGINT (Ctrl+C)
 * @description Stops all scheduled jobs and cache before process termination
 */
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  ScheduledJobs.stopAll();
  cache.destroy();
  process.exit(0);
});

/**
 * Unbehandelte Promise-Rejection: geloggt (mit Stacktrace), aber NICHT sofort
 * beenden — so wird ein Fehler sichtbar, ohne den laufenden Betrieb abzureißen.
 */
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason?.message || String(reason),
    stack: reason?.stack
  });
});

/**
 * Unbehandelte Exception: der Prozesszustand ist danach undefiniert → kontrolliert
 * herunterfahren und mit Exit-Code 1 beenden. Ein Prozessmanager (systemd/PM2,
 * siehe TODO T3.2) startet den Prozess neu.
 */
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception — controlled shutdown', {
    error: err.message,
    stack: err.stack
  });
  try {
    ScheduledJobs.stopAll();
    cache.destroy();
  } catch (cleanupErr) {
    logger.error('Cleanup during uncaughtException failed', { error: cleanupErr });
  }
  process.exit(1);
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