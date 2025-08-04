/**
 * @file Trial middleware for managing vendor trial periods
 * @description Provides middleware functions for checking trial status, enforcing trial
 * restrictions, and managing trial-related functionality
 * @author Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { TrialService } from '../services/trialService';

/**
 * Interface extending Request with trial-related properties
 * @interface TrialRequest
 * @extends Request
 */
interface TrialRequest extends Request {
  /** User information from authentication */
  user?: { id: string; isAdmin?: boolean; isVendor?: boolean; email?: string };
  /** User ID for convenience access */
  userId?: string;
  /** Trial information attached to request */
  trialInfo?: {
    /** Current trial status */
    status: string;
    /** Whether trial is currently active */
    isActive: boolean;
    /** Days remaining in trial */
    daysRemaining: number;
    /** Trial end date */
    endDate?: Date;
    /** Whether trial has expired */
    isExpired: boolean;
    /** Whether trial can be converted to paid */
    canConvert: boolean;
  };
}

/**
 * Middleware to check trial status and add trial info to request
 * @param {TrialRequest} req - Express request object with trial properties
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 * @complexity O(1) - single database lookup
 * @description Retrieves trial status and attaches it to the request object
 */
export const checkTrialStatus = async (req: TrialRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      next();
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      next();
      return;
    }

    // Get trial status
    const trialStatus = await TrialService.getTrialStatus(user);
    
    // Add trial info to request
    req.trialInfo = {
      status: user.registrationStatus || 'unknown',
      isActive: trialStatus.isActive,
      daysRemaining: trialStatus.daysRemaining,
      endDate: user.trialEndDate,
      isExpired: trialStatus.isExpired,
      canConvert: trialStatus.canConvert
    };

    next();
  } catch (error) {
    console.error('Error in trial status check:', error);
    next(); // Continue without trial info on error
  }
};

/**
 * Middleware to require active trial
 * @param {TrialRequest} req - Express request object with trial properties
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 * @complexity O(1) - single database lookup
 * @description Ensures user has an active trial before allowing access
 */
export const requireActiveTrial = async (req: TrialRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (user.registrationStatus !== 'trial_active') {
      res.status(403).json({
        success: false,
        message: 'Active trial required',
        trialStatus: user.registrationStatus
      });
      return;
    }

    // Check if trial is expired
    if (user.trialEndDate && user.trialEndDate <= new Date()) {
      res.status(403).json({
        success: false,
        message: 'Trial period has expired',
        trialStatus: 'trial_expired'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error in require active trial:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to add trial info to response
 * @param {TrialRequest} req - Express request object with trial properties
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 * @complexity O(1)
 * @description Enriches API responses with trial information
 */
export const enrichWithTrialInfo = (req: TrialRequest, res: Response, next: NextFunction): void => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    if (req.trialInfo && body && typeof body === 'object') {
      body.trialInfo = req.trialInfo;
    }
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Rate limiting middleware factory for trial users
 * @param {number} maxRequests - Maximum requests per window (default: 100)
 * @param {number} windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns {function} Express middleware function
 * @complexity O(1)
 * @security Limits API usage for trial users
 */
export const trialRateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: TrialRequest, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      next();
      return;
    }

    const now = Date.now();
    const userKey = `trial_${userId}`;
    const userRequests = requestCounts.get(userKey);
    
    if (!userRequests || now > userRequests.resetTime) {
      // Reset or create new count
      requestCounts.set(userKey, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (userRequests.count >= maxRequests) {
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded for trial users',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
      return;
    }
    
    userRequests.count++;
    requestCounts.set(userKey, userRequests);
    next();
  };
};

/**
 * Middleware factory to log trial actions
 * @param {string} action - Action name to log
 * @returns {function} Express middleware function
 * @complexity O(1)
 * @description Logs trial user actions for monitoring and analytics
 */
export const logTrialAction = (action: string) => {
  return (req: TrialRequest, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.userId;
    
    if (userId && req.trialInfo) {
      console.log(`Trial action: ${action} by user ${userId}, status: ${req.trialInfo.status}, days remaining: ${req.trialInfo.daysRemaining}`);
    }
    
    next();
  };
};