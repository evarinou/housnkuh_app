/**
 * @file Security logging utility for monitoring and auditing security events
 * @description Implements a singleton security logger that tracks authentication attempts, 
 * suspicious activities, and security-related events in the application
 * @author Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Request } from 'express';

/**
 * Interface representing a security event in the system
 * @interface SecurityEvent
 */
export interface SecurityEvent {
  /** Timestamp when the event occurred */
  timestamp: Date;
  /** Type of security event */
  event: string;
  /** User ID associated with the event (optional) */
  userId?: string;
  /** Email address associated with the event (optional) */
  email?: string;
  /** IP address where the event originated */
  ipAddress?: string;
  /** User agent string from the request */
  userAgent?: string;
  /** Whether the event was successful */
  success: boolean;
  /** Additional event details */
  details?: any;
  /** Severity level of the event */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Security logger singleton class for tracking security events
 * @class SecurityLogger
 * @description Implements singleton pattern for centralized security event logging
 */
class SecurityLogger {
  /** Singleton instance */
  private static instance: SecurityLogger;
  /** Array to store security events in memory */
  private events: SecurityEvent[] = [];
  /** Maximum number of events to keep in memory */
  private readonly MAX_EVENTS = 10000; // Keep last 10k events in memory

  /** Private constructor to enforce singleton pattern */
  private constructor() {}

  /**
   * Gets the singleton instance of SecurityLogger
   * @returns {SecurityLogger} The singleton instance
   * @complexity O(1)
   */
  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Extracts request information for security logging
   * @param {Request} req - Express request object
   * @returns {Object} Object containing IP address and user agent
   * @complexity O(1)
   */
  private extractRequestInfo(req: Request) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
    };
  }

  /**
   * Logs a security event to console and memory
   * @param {SecurityEvent} event - Security event to log
   * @complexity O(1) amortized
   * @security Logs sensitive security events
   */
  private log(event: SecurityEvent) {
    console.log(`[SECURITY] ${event.severity.toUpperCase()}: ${event.event}`, {
      timestamp: event.timestamp,
      userId: event.userId,
      email: event.email,
      ipAddress: event.ipAddress,
      success: event.success,
      details: event.details
    });

    // Store in memory (in production, this should go to a proper log aggregation service)
    this.events.push(event);
    
    // Keep only the last MAX_EVENTS to prevent memory overflow
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
  }

  // Authentication events
  /**
   * Logs a login attempt event
   * @param {Request} req - Express request object
   * @param {string} email - Email address used for login
   * @param {boolean} success - Whether the login was successful
   * @param {any} details - Additional details about the attempt
   * @complexity O(1)
   * @security Logs authentication attempts
   */
  logLoginAttempt(req: Request, email: string, success: boolean, details?: any) {
    const requestInfo = this.extractRequestInfo(req);
    this.log({
      timestamp: new Date(),
      event: 'LOGIN_ATTEMPT',
      email,
      success,
      severity: success ? 'low' : 'medium',
      details,
      ...requestInfo
    });
  }

  /**
   * Logs a vendor registration event
   * @param {Request} req - Express request object
   * @param {string} email - Email address used for registration
   * @param {boolean} success - Whether the registration was successful
   * @param {any} details - Additional details about the registration
   * @complexity O(1)
   * @security Logs vendor registration attempts
   */
  logVendorRegistration(req: Request, email: string, success: boolean, details?: any) {
    const requestInfo = this.extractRequestInfo(req);
    this.log({
      timestamp: new Date(),
      event: 'VENDOR_REGISTRATION',
      email,
      success,
      severity: success ? 'low' : 'medium',
      details,
      ...requestInfo
    });
  }

  /**
   * Logs an email confirmation event
   * @param {Request} req - Express request object
   * @param {string} token - Confirmation token (will be truncated for security)
   * @param {boolean} success - Whether the confirmation was successful
   * @param {string} userId - User ID associated with the confirmation
   * @param {any} details - Additional details about the confirmation
   * @complexity O(1)
   * @security Logs email confirmation attempts, truncates token for security
   */
  logEmailConfirmation(req: Request, token: string, success: boolean, userId?: string, details?: any) {
    const requestInfo = this.extractRequestInfo(req);
    this.log({
      timestamp: new Date(),
      event: 'EMAIL_CONFIRMATION',
      userId,
      success,
      severity: success ? 'low' : 'high',
      details: {
        token: token.substring(0, 8) + '...', // Log only first 8 chars for security
        ...details
      },
      ...requestInfo
    });
  }

  /**
   * Logs a password reset event
   * @param {Request} req - Express request object
   * @param {string} email - Email address requesting password reset
   * @param {boolean} success - Whether the reset was successful
   * @param {any} details - Additional details about the reset
   * @complexity O(1)
   * @security Logs password reset attempts
   */
  logPasswordReset(req: Request, email: string, success: boolean, details?: any) {
    const requestInfo = this.extractRequestInfo(req);
    this.log({
      timestamp: new Date(),
      event: 'PASSWORD_RESET',
      email,
      success,
      severity: success ? 'low' : 'medium',
      details,
      ...requestInfo
    });
  }

  /**
   * Logs an admin setup event
   * @param {Request} req - Express request object
   * @param {string} username - Username for admin setup
   * @param {boolean} success - Whether the setup was successful
   * @param {any} details - Additional details about the setup
   * @complexity O(1)
   * @security Logs admin setup attempts
   */
  logAdminSetup(req: Request, username: string, success: boolean, details?: any) {
    const requestInfo = this.extractRequestInfo(req);
    this.log({
      timestamp: new Date(),
      event: 'ADMIN_SETUP',
      userId: username,
      success,
      severity: success ? 'medium' : 'high',
      details,
      ...requestInfo
    });
  }

  /**
   * Logs a rate limit exceeded event
   * @param {Request} req - Express request object
   * @param {string} endpoint - Endpoint where rate limit was exceeded
   * @param {any} details - Additional details about the rate limit
   * @complexity O(1)
   * @security Logs rate limit violations
   */
  logRateLimitExceeded(req: Request, endpoint: string, details?: any) {
    const requestInfo = this.extractRequestInfo(req);
    this.log({
      timestamp: new Date(),
      event: 'RATE_LIMIT_EXCEEDED',
      success: false,
      severity: 'medium',
      details: {
        endpoint,
        ...details
      },
      ...requestInfo
    });
  }

  /**
   * Logs a validation error event
   * @param {Request} req - Express request object
   * @param {string} endpoint - Endpoint where validation failed
   * @param {any[]} errors - Array of validation errors
   * @complexity O(n) where n is number of errors
   * @security Logs validation failures
   */
  logValidationError(req: Request, endpoint: string, errors: any[]) {
    const requestInfo = this.extractRequestInfo(req);
    this.log({
      timestamp: new Date(),
      event: 'VALIDATION_ERROR',
      success: false,
      severity: 'low',
      details: {
        endpoint,
        errors: errors.map(e => ({ field: e.field, message: e.message }))
      },
      ...requestInfo
    });
  }

  /**
   * Logs a suspicious activity event
   * @param {Request} req - Express request object
   * @param {string} activity - Description of suspicious activity
   * @param {any} details - Additional details about the activity
   * @complexity O(1)
   * @security Logs suspicious activities
   */
  logSuspiciousActivity(req: Request, activity: string, details?: any) {
    const requestInfo = this.extractRequestInfo(req);
    this.log({
      timestamp: new Date(),
      event: 'SUSPICIOUS_ACTIVITY',
      success: false,
      severity: 'high',
      details: {
        activity,
        ...details
      },
      ...requestInfo
    });
  }

  /**
   * Logs a token expired event
   * @param {Request} req - Express request object
   * @param {string} tokenType - Type of token that expired
   * @param {string} userId - User ID associated with the token
   * @complexity O(1)
   * @security Logs token expiration events
   */
  logTokenExpired(req: Request, tokenType: string, userId?: string) {
    const requestInfo = this.extractRequestInfo(req);
    this.log({
      timestamp: new Date(),
      event: 'TOKEN_EXPIRED',
      userId,
      success: false,
      severity: 'low',
      details: {
        tokenType
      },
      ...requestInfo
    });
  }

  /**
   * Logs an invalid token event
   * @param {Request} req - Express request object
   * @param {string} tokenType - Type of invalid token
   * @param {string} token - Invalid token (will be truncated for security)
   * @complexity O(1)
   * @security Logs invalid token attempts, truncates token for security
   */
  logInvalidToken(req: Request, tokenType: string, token: string) {
    const requestInfo = this.extractRequestInfo(req);
    this.log({
      timestamp: new Date(),
      event: 'INVALID_TOKEN',
      success: false,
      severity: 'medium',
      details: {
        tokenType,
        token: token.substring(0, 8) + '...' // Log only first 8 chars
      },
      ...requestInfo
    });
  }

  /**
   * Gets recent security events for monitoring
   * @param {number} limit - Maximum number of events to return
   * @returns {SecurityEvent[]} Array of recent security events
   * @complexity O(1)
   */
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Gets events by severity level
   * @param {SecurityEvent['severity']} severity - Severity level to filter by
   * @param {number} limit - Maximum number of events to return
   * @returns {SecurityEvent[]} Array of events matching the severity
   * @complexity O(n) where n is number of events
   */
  getEventsBySeverity(severity: SecurityEvent['severity'], limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.severity === severity)
      .slice(-limit);
  }

  /**
   * Gets failed security events
   * @param {number} limit - Maximum number of events to return
   * @returns {SecurityEvent[]} Array of failed security events
   * @complexity O(n) where n is number of events
   */
  getFailedEvents(limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => !event.success)
      .slice(-limit);
  }
}

export default SecurityLogger.getInstance();