/**
 * @file Logger utility for the housnkuh marketplace application
 * @description Comprehensive logging service using Winston with security-focused sanitization
 * Provides structured logging with daily rotation, sensitive data filtering, and audit capabilities
 * @author System
 * @version 1.0.0
 * @since 2024-01-01
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/** @description Log directory path relative to this file */
const logDir = path.join(__dirname, '../../logs');

/**
 * @description Winston log levels configuration
 * @complexity Low - Simple priority mapping
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * @description Color mapping for console output
 * @complexity Low - Simple color assignments
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

winston.addColors(colors);

/**
 * @description File log format configuration for production
 * @complexity Medium - Multiple format combiners with timestamp and error handling
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

/**
 * @description Console log format for development environment
 * @complexity Medium - Custom formatter with colorization and metadata handling
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

/**
 * @description Winston transport configuration array
 * @complexity Low - Simple transport array initialization
 */
const transports: winston.transport[] = [];

/**
 * Console transport configuration for development environment
 * @description Enables colored console output with debug level logging
 * @complexity Low - Conditional transport setup
 */
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
}

/**
 * File transport configuration for production environment
 * @description Sets up daily rotating file logs with size and retention limits
 * @complexity Medium - Multiple file transports with rotation configuration
 */
if (process.env.NODE_ENV === 'production') {
  // Error log - separate file for error level logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      handleExceptions: true,
      maxFiles: '30d',
      maxSize: '20m',
      format: logFormat
    })
  );

  // Combined log - all log levels in one file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      format: logFormat
    })
  );
}

/**
 * @description Main Winston logger instance with environment-specific configuration
 * @complexity Medium - Environment-aware logger configuration
 */
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  transports,
  exitOnError: false
});

/**
 * @description List of sensitive field names to redact from logs
 * @security Critical - Prevents sensitive data exposure in logs
 * @complexity Low - Simple string array for field matching
 */
const sensitiveFields = [
  'password',
  'token',
  'jwt',
  'cookie',
  'authorization',
  'credit_card',
  'social_security',
  'ssn'
];

/**
 * @description Recursively sanitizes objects by redacting sensitive fields
 * @param {any} obj - Object to sanitize
 * @security Critical - Prevents sensitive data leakage in logs
 * @complexity Medium - Recursive object traversal with field filtering
 * @returns {any} Sanitized object with sensitive fields redacted
 */
const sanitizeObject = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * @interface LoggerInterface
 * @description Type definition for the logger interface with security and audit methods
 */
interface LoggerInterface {
  /** @description Log error level messages with optional metadata */
  error: (message: string, meta?: any) => void;
  /** @description Log warning level messages with optional metadata */
  warn: (message: string, meta?: any) => void;
  /** @description Log info level messages with optional metadata */
  info: (message: string, meta?: any) => void;
  /** @description Log debug level messages with optional metadata */
  debug: (message: string, meta?: any) => void;
  /** @description Log HTTP request details with response time */
  request: (req: any, res: any, responseTime?: number) => void;
  /** @description Log audit trail events with user context */
  audit: (action: string, userId: string, details?: any) => void;
}

/**
 * @description Logger interface implementation with security sanitization
 * @complexity Medium - Multiple logging methods with sanitization
 */
const loggerInterface: LoggerInterface = {
  /**
   * @description Log error level messages with sanitized metadata
   * @param {string} message - Error message to log
   * @param {any} [meta] - Optional metadata to include
   * @security Automatically sanitizes sensitive data
   * @complexity Low - Simple error logging with sanitization
   */
  error: (message: string, meta?: any) => {
    logger.error(message, sanitizeObject(meta));
  },
  
  /**
   * @description Log warning level messages with sanitized metadata
   * @param {string} message - Warning message to log
   * @param {any} [meta] - Optional metadata to include
   * @security Automatically sanitizes sensitive data
   * @complexity Low - Simple warning logging with sanitization
   */
  warn: (message: string, meta?: any) => {
    logger.warn(message, sanitizeObject(meta));
  },
  
  /**
   * @description Log info level messages with sanitized metadata
   * @param {string} message - Info message to log
   * @param {any} [meta] - Optional metadata to include
   * @security Automatically sanitizes sensitive data
   * @complexity Low - Simple info logging with sanitization
   */
  info: (message: string, meta?: any) => {
    logger.info(message, sanitizeObject(meta));
  },
  
  /**
   * @description Log debug level messages with sanitized metadata
   * @param {string} message - Debug message to log
   * @param {any} [meta] - Optional metadata to include
   * @security Automatically sanitizes sensitive data
   * @complexity Low - Simple debug logging with sanitization
   */
  debug: (message: string, meta?: any) => {
    logger.debug(message, sanitizeObject(meta));
  },
  
  /**
   * @description Log HTTP request details with performance metrics
   * @param {any} req - Express request object
   * @param {any} res - Express response object
   * @param {number} [responseTime] - Optional response time in milliseconds
   * @security Sanitizes request data and excludes sensitive headers
   * @complexity Medium - Request metadata extraction with sanitization
   */
  request: (req: any, res: any, responseTime?: number) => {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id
    };
    
    logger.info('HTTP Request', sanitizeObject(meta));
  },
  
  /**
   * @description Log audit trail events for security and compliance
   * @param {string} action - Action performed
   * @param {string} userId - User ID who performed the action
   * @param {any} [details] - Optional action details
   * @security Creates audit trail with timestamp and sanitized details
   * @complexity Low - Simple audit logging with timestamp
   */
  audit: (action: string, userId: string, details?: any) => {
    const meta = {
      action,
      userId,
      timestamp: new Date().toISOString(),
      details: sanitizeObject(details)
    };
    
    logger.info('Audit Log', meta);
  }
};

export default loggerInterface;