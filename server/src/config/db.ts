/**
 * @file Database connection and configuration module
 * @description Handles MongoDB connection with optimized settings and creates performance indexes
 * for the housnkuh marketplace application
 */

import mongoose from 'mongoose';
import config from './config';
import logger from '../utils/logger';

/**
 * Establishes connection to MongoDB with optimized settings
 * @description Connects to MongoDB using configuration from config module
 * Includes performance-optimized connection settings and creates indexes after connection
 * @throws {Error} Exits process if connection fails
 * @complexity O(1) - Single connection establishment
 */
async function connectDB(): Promise<void> {
  try {
    // Enhanced connection options for performance
    await mongoose.connect(config.mongoURI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    logger.info('MongoDB verbunden mit optimierten Einstellungen');
    
    // Create performance indexes after connection
    await createPerformanceIndexes();
    
  } catch (error) {
    logger.error('Fehler bei der Verbindung zur MongoDB:', error);
    process.exit(1);
  }
}

/**
 * Creates performance-optimized database indexes
 * @description Creates compound, partial, and text indexes for common query patterns
 * Indexes are created in background to avoid blocking database operations
 * @throws Logs warning if index creation fails but doesn't stop execution
 * @complexity O(n log n) - Index creation time varies by collection size
 */
async function createPerformanceIndexes(): Promise<void> {
  try {
    const User = mongoose.model('User');
    
    // Compound index for email lookup with vendor and account status
    await User.collection.createIndex(
      { 'kontakt.email': 1, 'isVendor': 1, 'isFullAccount': 1 },
      { background: true, name: 'email_vendor_account_idx' }
    );
    
    // Compound index for registration status queries
    await User.collection.createIndex(
      { 'registrationStatus': 1, 'isVendor': 1 },
      { background: true, name: 'registration_vendor_idx' }
    );
    
    // Compound index for trial date range queries
    await User.collection.createIndex(
      { 'trialStartDate': 1, 'trialEndDate': 1 },
      { background: true, name: 'trial_dates_idx' }
    );
    
    // Compound index for public visibility filtering
    await User.collection.createIndex(
      { 'isPubliclyVisible': 1, 'kontakt.status': 1, 'kontakt.newsletterConfirmed': 1 },
      { background: true, name: 'public_visibility_idx' }
    );
    
    // Partial index for active vendors only (reduces index size)
    await User.collection.createIndex(
      { 'isVendor': 1, 'registrationStatus': 1, 'createdAt': -1 },
      { 
        background: true,
        partialFilterExpression: { 'isVendor': true },
        name: 'active_vendors_idx'
      }
    );
    
    // Text index for full-text search on vendor profiles
    await User.collection.createIndex(
      { 
        'vendorProfile.unternehmen': 'text',
        'vendorProfile.beschreibung': 'text',
        'kontakt.name': 'text'
      },
      { background: true, name: 'vendor_search_text_idx' }
    );
    
    logger.info('Performance-Indizes erfolgreich erstellt');
  } catch (error) {
    logger.warn('Warnung beim Erstellen der Performance-Indizes:', error);
  }
}

/**
 * Development query monitoring configuration
 * @description Enables detailed query logging in development environment
 * Logs all MongoDB operations with collection name, method, and query details
 */
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', (collectionName: string, method: string, query: any) => {
    logger.info(`MongoDB Query: ${collectionName}.${method}`, JSON.stringify(query, null, 2));
  });
}

export default connectDB;