/**
 * @file Trial Management Service for admin trial operations
 * @description Service for managing trial extensions, bulk operations, and audit logging
 * @author System
 * @version 1.0.0
 * @since 2024-01-01
 */

// server/src/services/trialManagementService.ts
import User from '../models/User';
import Vertrag from '../models/Vertrag';
import { IUser } from '../types/modelTypes';
import { sendTrialStatusEmail } from '../utils/emailService';
import { performanceMonitor } from '../utils/performanceMonitor';

/**
 * @interface TrialExtensionResult
 * @description Result object for trial extension operations
 */
interface TrialExtensionResult {
  /** @description Whether the extension was successful */
  success: boolean;
  /** @description User ID that was extended */
  userId: string;
  /** @description Username that was extended */
  username: string;
  /** @description Previous trial end date */
  previousEndDate: Date;
  /** @description New trial end date */
  newEndDate: Date;
  /** @description Success message */
  message?: string;
  /** @description Error message if failed */
  error?: string;
}

/**
 * @interface BulkUpdateResult
 * @description Result object for bulk update operations
 */
interface BulkUpdateResult {
  /** @description Number of successful updates */
  successful: number;
  /** @description Number of failed updates */
  failed: number;
  /** @description Detailed results for each user */
  results: Array<{
    userId: string;
    username: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * @interface TrialAuditEntry
 * @description Audit log entry for trial management actions
 */
interface TrialAuditEntry {
  /** @description User ID affected */
  userId: string;
  /** @description Username affected */
  username: string;
  /** @description Action performed */
  action: string;
  /** @description User who performed the action */
  performedBy: string;
  /** @description Timestamp of the action */
  timestamp: Date;
  /** @description Additional details */
  details: any;
}

/**
 * @class TrialManagementService
 * @description Singleton service for managing trial extensions, bulk operations, and audit logging
 * @security Implements audit logging for all trial management operations
 * @complexity High - Complex trial management with audit logging and bulk operations
 */
class TrialManagementService {
  private static instance: TrialManagementService;
  private auditLog: TrialAuditEntry[] = [];

  private constructor() {}

  /**
   * @description Get singleton instance of TrialManagementService
   * @returns {TrialManagementService} Singleton instance
   * @complexity Low - Singleton pattern implementation
   */
  static getInstance(): TrialManagementService {
    if (!TrialManagementService.instance) {
      TrialManagementService.instance = new TrialManagementService();
    }
    return TrialManagementService.instance;
  }

  /**
   * @description Extend a vendor's trial period
   * @param {string} userId - User ID to extend trial for
   * @param {number} extensionDays - Number of days to extend
   * @param {string} adminEmail - Admin email performing the extension
   * @param {string} [reason] - Optional reason for extension
   * @security Validates user existence and vendor status
   * @complexity High - Extension calculation with automation reset and email notification
   * @returns {Promise<TrialExtensionResult>} Result object with extension details
   */
  async extendTrial(
    userId: string, 
    extensionDays: number, 
    adminEmail: string,
    reason?: string
  ): Promise<TrialExtensionResult> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          userId,
          username: 'Unknown',
          previousEndDate: new Date(),
          newEndDate: new Date(),
          error: 'User not found'
        };
      }

      if (!user.isVendor) {
        return {
          success: false,
          userId,
          username: user.username || 'unknown',
          previousEndDate: new Date(),
          newEndDate: new Date(),
          error: 'User is not a vendor'
        };
      }

      const previousEndDate = user.trialEndDate || new Date();
      const currentDate = new Date();
      
      // Calculate new end date from current date or existing end date, whichever is later
      const baseDate = previousEndDate > currentDate ? previousEndDate : currentDate;
      const newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + extensionDays);

      // Update user
      user.trialEndDate = newEndDate;
      
      // Update automation notes
      const extensionNote = `Trial extended by ${extensionDays} days by ${adminEmail} on ${currentDate.toISOString()}${reason ? ` - Reason: ${reason}` : ''}`;
      user.trialAutomation = user.trialAutomation || {
        emailsAutomated: true,
        remindersSent: {
          sevenDayReminder: false,
          threeDayReminder: false,
          oneDayReminder: false,
          expirationNotification: false
        },
        lastReminderSent: undefined,
        trialConversionDate: undefined,
        automationNotes: ''
      };
      
      if (user.trialAutomation) {
        user.trialAutomation.automationNotes = 
          (user.trialAutomation.automationNotes || '') + '\n' + extensionNote;

        // Reset reminder flags since trial was extended
        user.trialAutomation.remindersSent = {
          sevenDayReminder: false,
          threeDayReminder: false,
          oneDayReminder: false,
          expirationNotification: false
        };
      }

      await user.save();

      // Send notification email to vendor
      try {
        // TODO: Fix email implementation after test cleanup
        console.log(`Trial extended for user ${user.username || 'unknown'} until ${newEndDate.toISOString()}`);
        // await sendTrialStatusEmail(user, { 
        //   trialEndDate: newEndDate,
        //   status: 'extended' 
        // });
      } catch (emailError) {
        console.error('Failed to send trial extension email:', emailError);
      }

      // Log audit entry
      this.logAuditEntry({
        userId: String(user._id),
        username: user.username || 'unknown',
        action: 'trial_extended',
        performedBy: adminEmail,
        timestamp: new Date(),
        details: {
          extensionDays,
          previousEndDate,
          newEndDate,
          reason
        }
      });

      return {
        success: true,
        userId: String(user._id),
        username: user.username || 'unknown',
        previousEndDate,
        newEndDate,
        message: `Trial extended successfully by ${extensionDays} days`
      };
    } catch (error) {
      console.error('Error extending trial:', error);
      return {
        success: false,
        userId,
        username: 'Unknown',
        previousEndDate: new Date(),
        newEndDate: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * @description Bulk update trial status for multiple vendors
   * @param {string[]} userIds - Array of user IDs to update
   * @param {'extend' | 'expire' | 'reset_reminders'} action - Action to perform
   * @param {string} adminEmail - Admin email performing the action
   * @param {object} [options] - Optional parameters
   * @param {number} [options.extensionDays] - Days to extend for extend action
   * @param {string} [options.reason] - Reason for the action
   * @security Processes multiple users with comprehensive audit logging
   * @complexity High - Bulk operations with individual result tracking
   * @returns {Promise<BulkUpdateResult>} Result object with bulk operation statistics
   */
  async bulkUpdateTrialStatus(
    userIds: string[],
    action: 'extend' | 'expire' | 'reset_reminders',
    adminEmail: string,
    options?: {
      extensionDays?: number;
      reason?: string;
    }
  ): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      successful: 0,
      failed: 0,
      results: []
    };

    for (const userId of userIds) {
      try {
        let success = false;
        let message = '';

        switch (action) {
          case 'extend':
            if (!options?.extensionDays) {
              throw new Error('Extension days required for extend action');
            }
            const extensionResult = await this.extendTrial(
              userId,
              options.extensionDays,
              adminEmail,
              options.reason
            );
            success = extensionResult.success;
            message = extensionResult.message || extensionResult.error || '';
            break;

          case 'expire':
            const expireResult = await this.expireTrial(userId, adminEmail, options?.reason);
            success = expireResult.success;
            message = expireResult.message || '';
            break;

          case 'reset_reminders':
            const resetResult = await this.resetTrialReminders(userId, adminEmail);
            success = resetResult.success;
            message = resetResult.message || '';
            break;
        }

        if (success) {
          result.successful++;
        } else {
          result.failed++;
        }

        const user = await User.findById(userId);
        result.results.push({
          userId,
          username: user?.username || 'Unknown',
          success,
          error: success ? undefined : message
        });

      } catch (error) {
        result.failed++;
        result.results.push({
          userId,
          username: 'Unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log bulk operation
    this.logAuditEntry({
      userId: 'bulk_operation',
      username: 'System',
      action: `bulk_${action}`,
      performedBy: adminEmail,
      timestamp: new Date(),
      details: {
        totalUsers: userIds.length,
        successful: result.successful,
        failed: result.failed,
        options
      }
    });

    return result;
  }

  /**
   * @description Expire a trial immediately
   * @param {string} userId - User ID to expire trial for
   * @param {string} adminEmail - Admin email performing the expiration
   * @param {string} [reason] - Optional reason for expiration
   * @security Validates user existence and updates trial end date
   * @complexity Medium - Immediate trial expiration with audit logging
   * @returns {Promise<any>} Result object with success status
   */
  private async expireTrial(userId: string, adminEmail: string, reason?: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.isVendor) {
        return { success: false, message: 'User not found or not a vendor' };
      }

      user.trialEndDate = new Date(); // Set to now
      if (user.trialAutomation) {
        user.trialAutomation.automationNotes += 
          `\nTrial manually expired by ${adminEmail} on ${new Date().toISOString()}${reason ? ` - Reason: ${reason}` : ''}`;
      }

      await user.save();

      return {
        success: true,
        message: 'Trial expired successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * @description Reset trial reminder flags
   * @param {string} userId - User ID to reset reminders for
   * @param {string} adminEmail - Admin email performing the reset
   * @security Validates user existence and resets reminder flags
   * @complexity Medium - Reminder flag reset with audit logging
   * @returns {Promise<any>} Result object with success status
   */
  private async resetTrialReminders(userId: string, adminEmail: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.isVendor) {
        return { success: false, message: 'User not found or not a vendor' };
      }

      if (user.trialAutomation) {
        user.trialAutomation.remindersSent = {
          sevenDayReminder: false,
          threeDayReminder: false,
          oneDayReminder: false,
          expirationNotification: false
        };
        user.trialAutomation.lastReminderSent = undefined;
        user.trialAutomation.automationNotes += 
          `\nReminders reset by ${adminEmail} on ${new Date().toISOString()}`;
      }

      await user.save();

      return {
        success: true,
        message: 'Trial reminders reset successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * @description Get audit log entries
   * @param {object} [filters] - Optional filters for audit log
   * @param {string} [filters.userId] - Filter by user ID
   * @param {string} [filters.action] - Filter by action type
   * @param {string} [filters.performedBy] - Filter by admin who performed action
   * @param {Date} [filters.startDate] - Filter by start date
   * @param {Date} [filters.endDate] - Filter by end date
   * @param {number} limit - Maximum number of entries to return
   * @security Provides filtered audit trail
   * @complexity Medium - Multi-criteria filtering with sorting
   * @returns {Promise<TrialAuditEntry[]>} Array of audit log entries
   */
  async getAuditLog(
    filters?: {
      userId?: string;
      action?: string;
      performedBy?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100
  ): Promise<TrialAuditEntry[]> {
    let filteredLog = [...this.auditLog];

    if (filters) {
      if (filters.userId) {
        filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
      }
      if (filters.action) {
        filteredLog = filteredLog.filter(entry => entry.action === filters.action);
      }
      if (filters.performedBy) {
        filteredLog = filteredLog.filter(entry => entry.performedBy === filters.performedBy);
      }
      if (filters.startDate) {
        filteredLog = filteredLog.filter(entry => entry.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLog = filteredLog.filter(entry => entry.timestamp <= filters.endDate!);
      }
    }

    // Sort by timestamp descending and limit
    return filteredLog
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * @description Log an audit entry
   * @param {TrialAuditEntry} entry - Audit entry to log
   * @security Maintains audit trail with memory management
   * @complexity Medium - Audit logging with memory limits
   */
  private logAuditEntry(entry: TrialAuditEntry): void {
    this.auditLog.push(entry);
    
    // Keep only last 10000 entries to prevent memory issues
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    // Also log to console for monitoring
    console.log(`[TRIAL AUDIT] ${entry.action} by ${entry.performedBy} for ${entry.username}`);
  }

  /**
   * @description Get vendors with trials expiring soon
   * @param {number} daysAhead - Number of days ahead to check
   * @security Returns vendors with expiring trials
   * @complexity Medium - Date-based query with exclusion criteria
   * @returns {Promise<IUser[]>} Array of users with expiring trials
   */
  async getExpiringTrials(daysAhead: number = 7): Promise<IUser[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return User.find({
      isVendor: true,
      trialEndDate: {
        $gte: new Date(),
        $lte: futureDate
      },
      'trialAutomation.trialConversionDate': { $exists: false }
    })
    .sort({ trialEndDate: 1 })
    .lean();
  }

  /**
   * @description Search vendors by trial status
   * @param {'active' | 'expired' | 'converted' | 'all'} status - Trial status to filter by
   * @param {string} [searchTerm] - Optional search term
   * @security Returns filtered vendor list based on trial status
   * @complexity High - Complex query with status filtering and search
   * @returns {Promise<IUser[]>} Array of matching users
   */
  async searchVendorsByTrialStatus(
    status: 'active' | 'expired' | 'converted' | 'all',
    searchTerm?: string
  ): Promise<IUser[]> {
    const query: any = { isVendor: true };
    const now = new Date();

    switch (status) {
      case 'active':
        query.trialEndDate = { $gte: now };
        query['trialAutomation.trialConversionDate'] = { $exists: false };
        break;
      case 'expired':
        query.trialEndDate = { $lt: now };
        query['trialAutomation.trialConversionDate'] = { $exists: false };
        break;
      case 'converted':
        query['trialAutomation.trialConversionDate'] = { $exists: true };
        break;
    }

    if (searchTerm) {
      query.$or = [
        { username: { $regex: searchTerm, $options: 'i' } },
        { 'kontakt.email': { $regex: searchTerm, $options: 'i' } },
        { 'vendorProfile.businessName': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    return User.find(query)
      .select('username kontakt vendorProfile trialStartDate trialEndDate trialAutomation')
      .sort({ createdAt: -1 })
      .lean();
  }
}

export const trialManagementService = TrialManagementService.getInstance();