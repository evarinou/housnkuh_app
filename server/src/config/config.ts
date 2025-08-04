/**
 * @file Application configuration module
 * @description Centralized configuration management for the housnkuh marketplace application
 * Handles environment variable loading with fallbacks and validation
 */

import logger from '../utils/logger';

/**
 * MongoDB connection URI configuration
 * @description Database connection string with fallback to localhost
 * Logs the configuration for debugging purposes
 */
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';
logger.info('🔧 Config - process.env.MONGO_URI:', { mongoURI: process.env.MONGO_URI });
logger.info('🔧 Config - Using mongoURI:', { mongoURI });

/**
 * Application configuration object
 * @description Contains all application configuration with environment variable overrides
 * Validates production requirements and provides development fallbacks
 */
export default {
  /** Database connection URI */
  mongoURI,
  
  /** 
   * JWT secret for token signing
   * @description Production environments must provide JWT_SECRET via environment variable
   * Development uses a default secret with warning logged
   * @throws {Error} In production if JWT_SECRET is not provided
   */
  jwtSecret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    logger.warn('⚠️  Using default JWT secret in development. Set JWT_SECRET environment variable.');
    return 'development-jwt-secret-not-for-production';
  })(),
  
  /** Server port configuration with fallback to 4000 */
  port: process.env.PORT || 4000
};
