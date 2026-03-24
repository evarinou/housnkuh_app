/**
 * @file Advanced database configuration and performance utilities
 * @description Provides enhanced MongoDB connection management, performance monitoring,
 * and health check capabilities for the housnkuh marketplace application
 */

import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * Database configuration object with performance optimizations
 * @description Centralized configuration for MongoDB connection options,
 * query timeouts, and performance monitoring settings
 */
export const DATABASE_CONFIG = {
  // Connection options for performance
  connectionOptions: {
    // Connection pooling for better performance
    maxPoolSize: 10, // Maximum number of connections in the pool
    serverSelectionTimeoutMS: 5000, // How long to try connecting before timing out
    socketTimeoutMS: 45000, // How long a socket is kept alive before timing out
    family: 4, // Use IPv4, skip trying IPv6
    
    // Performance optimizations
    bufferMaxEntries: 0, // Disable mongoose buffering
    bufferCommands: false, // Disable mongoose buffering
    
    // Query optimization
    autoIndex: process.env.NODE_ENV !== 'production', // Only auto-create indexes in development
    
    // Additional performance options
    readPreference: 'primary' as any, // Always read from primary for consistency
    readConcern: { level: 'local' } as any, // Local read concern for better performance
    writeConcern: { w: 'majority' } as any, // Majority write concern for durability
  },
  
  // Query timeout settings
  queryTimeouts: {
    default: 5000, // 5 second default timeout
    complex: 10000, // 10 second timeout for complex queries
    report: 30000, // 30 second timeout for report queries
  },
  
  // Performance monitoring
  monitoring: {
    slowQueryThreshold: 100, // Log queries slower than 100ms
    explainSlowQueries: process.env.NODE_ENV === 'development',
  }
};

/**
 * Enhanced database connection function with performance optimizations
 * @description Establishes MongoDB connection with optimized settings and event listeners
 * @param mongoUri - MongoDB connection URI
 * @throws {Error} If connection fails
 * @complexity O(1) - Connection establishment time
 */
export async function connectToDatabase(mongoUri: string): Promise<void> {
  try {
    // Set mongoose options for better performance
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);
    
    // Enable query logging in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName: string, method: string, query: any, doc: any) => {
        const startTime = Date.now();
        logger.debug('MongoDB Query', { collection: collectionName, method, query });
        
        // Log slow queries
        const duration = Date.now() - startTime;
        if (duration > DATABASE_CONFIG.monitoring.slowQueryThreshold) {
          logger.warn('Slow query detected', { durationMs: duration });
        }
      });
    }
    
    // Connect with optimized options
    await mongoose.connect(mongoUri, DATABASE_CONFIG.connectionOptions);
    
    logger.info('Connected to MongoDB with optimized settings');
    
    // Setup connection event listeners
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err });
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.info('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

/**
 * Query performance monitoring and utilities class
 * @description Provides methods for measuring query performance and debugging slow queries
 */
export class QueryPerformance {
  /**
   * Measures execution time of database queries
   * @description Wraps query execution with timing and logging for performance monitoring
   * @param queryName - Descriptive name for the query being measured
   * @param queryFn - Async function that executes the database query
   * @returns The result of the query function
   * @throws Re-throws any error from the query function with timing information
   * @complexity O(1) + complexity of queryFn
   */
  static async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      if (duration > DATABASE_CONFIG.monitoring.slowQueryThreshold) {
        logger.warn('Slow query', { queryName, durationMs: duration });
      } else {
        logger.debug('Query completed', { queryName, durationMs: duration });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query failed', { queryName, durationMs: duration, error });
      throw error;
    }
  }
  
  /**
   * Generates execution plan explanation for debugging slow queries
   * @description Provides detailed query execution statistics for optimization purposes
   * @param model - Mongoose model to explain queries for
   * @param query - Query object to analyze
   * @returns Query execution explanation object or null if disabled
   * @complexity O(1) - Explanation generation time
   */
  static async explainQuery(model: any, query: any): Promise<any> {
    if (!DATABASE_CONFIG.monitoring.explainSlowQueries) {
      return null;
    }
    
    try {
      const explanation = await model.find(query).explain('executionStats');
      logger.debug('Query explanation', { explanation });
      return explanation;
    } catch (error) {
      logger.error('Failed to explain query', { error });
      return null;
    }
  }
}

/**
 * Performs comprehensive database health assessment
 * @description Checks database connection status, resource usage, and performance metrics
 * @returns Health status object with detailed metrics
 * @complexity O(1) - Health check operations are constant time
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: any;
}> {
  try {
    const adminDb = mongoose.connection.db?.admin();
    if (!adminDb) {
      return { status: 'unhealthy', details: { error: 'No admin database connection' } };
    }
    
    const serverStatus = await adminDb.serverStatus();
    const dbStats = await mongoose.connection.db?.stats();
    
    // Check connection count
    const connectionCount = serverStatus.connections?.current || 0;
    const maxConnections = DATABASE_CONFIG.connectionOptions.maxPoolSize;
    
    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (connectionCount > maxConnections * 0.8) {
      status = 'degraded';
    }
    
    if (connectionCount >= maxConnections) {
      status = 'unhealthy';
    }
    
    return {
      status,
      details: {
        connections: {
          current: connectionCount,
          max: maxConnections,
          available: serverStatus.connections?.available || 0
        },
        memory: {
          resident: serverStatus.mem?.resident || 0,
          virtual: serverStatus.mem?.virtual || 0
        },
        database: {
          collections: dbStats?.collections || 0,
          dataSize: dbStats?.dataSize || 0,
          indexSize: dbStats?.indexSize || 0
        },
        uptime: serverStatus.uptime || 0
      }
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Default export containing all database utilities
 * @description Aggregates all database configuration and utility functions for easy import
 */
export default {
  DATABASE_CONFIG,
  connectToDatabase,
  QueryPerformance,
  checkDatabaseHealth
};