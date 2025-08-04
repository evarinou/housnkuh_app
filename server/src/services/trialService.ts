/**
 * @file Trial Service for managing vendor trial periods and automation
 * @description Comprehensive service for handling trial period activation, status tracking, and automated reminder systems
 * @author System
 * @version 1.0.0
 * @since 2024-01-01
 */

// server/src/services/trialService.ts
import User from '../models/User';
import Settings from '../models/Settings';
import { sendTrialActivationEmail, sendTrialExpirationWarning, sendTrialExpiredEmail, sendLaunchDayActivationNotification } from '../utils/emailService';
import { IUser, ITrialAutomation } from '../types/modelTypes';
import EmailTemplate from '../models/EmailTemplate';
import * as Handlebars from 'handlebars';
import logger from '../utils/logger';

/**
 * @interface TrialActivationResult
 * @description Result object for trial activation operations
 */
export interface TrialActivationResult {
  /** @description Whether the activation was successful */
  success: boolean;
  /** @description Number of vendors successfully activated */
  activatedCount: number;
  /** @description Number of vendors that failed activation */
  failedCount: number;
  /** @description Array of error messages from failed activations */
  errors: string[];
}

/**
 * @interface TrialStatusUpdateResult
 * @description Result object for trial status update operations
 */
export interface TrialStatusUpdateResult {
  /** @description Whether the status update was successful */
  success: boolean;
  /** @description Number of vendors processed */
  updatedCount: number;
  /** @description Number of vendors that expired */
  expiredCount: number;
  /** @description Array of warning messages from the update */
  warnings: string[];
}

/**
 * @class TrialService
 * @description Service for managing trial period activation and status tracking
 * @implements R003 (Trial Period Activation) and R008 (Trial Status Tracking)
 * @security Handles sensitive user data and email communications
 * @complexity High - Manages complex trial lifecycle with automated reminders
 */
export class TrialService {
  
  /**
   * @description Activate trials for all pre-registered vendors when store opens
   * @security Validates store opening status and user permissions
   * @complexity High - Batch processing with error handling and notifications
   * @returns {Promise<TrialActivationResult>} Result containing activation statistics
   * @throws {Error} If store opening validation fails
   */
  static async activateTrialsOnStoreOpening(): Promise<TrialActivationResult> {
    const result: TrialActivationResult = {
      success: true,
      activatedCount: 0,
      failedCount: 0,
      errors: []
    };

    try {
      // Check if store is open
      const settings = await Settings.getSettings();
      if (!settings.isStoreOpen()) {
        result.success = false;
        result.errors.push('Store is not yet open - cannot activate trials');
        return result;
      }

      const openingDate = settings.storeOpening.openingDate;
      if (!openingDate) {
        result.success = false;
        result.errors.push('No store opening date configured');
        return result;
      }

      // Find all pre-registered vendors
      const preregisteredVendors = await User.find({
        isVendor: true,
        registrationStatus: 'preregistered'
      });

      logger.info(`Found ${preregisteredVendors.length} pre-registered vendors to activate`);

      // Activate each vendor's trial
      for (const vendor of preregisteredVendors) {
        try {
          await this.activateSingleVendorTrial(vendor, openingDate);
          result.activatedCount++;
          
          logger.info(`Activated trial for vendor: ${vendor.kontakt.email}`);
        } catch (error) {
          result.failedCount++;
          result.errors.push(`Failed to activate trial for ${vendor.kontakt.email}: ${error}`);
          logger.error(`Failed to activate trial for vendor ${vendor.kontakt.email}:`, error);
        }
      }

      // Log summary
      logger.info(`Trial activation completed: ${result.activatedCount} activated, ${result.failedCount} failed`);
      
      // Send admin notification if vendors were activated
      if (result.activatedCount > 0 || result.failedCount > 0) {
        try {
          // Get admin emails
          const admins = await User.find({ isAdmin: true }).select('kontakt.email');
          const adminEmails = admins.map(admin => admin.kontakt.email).filter(email => email);
          
          if (adminEmails.length > 0) {
            await sendLaunchDayActivationNotification(adminEmails, {
              activatedCount: result.activatedCount,
              failedCount: result.failedCount,
              errors: result.errors,
              timestamp: new Date()
            });
            logger.info('Admin notification sent for launch day activation');
          } else {
            logger.warn('No admin emails found for launch day notification');
          }
        } catch (notificationError) {
          logger.error('Failed to send admin notification:', notificationError);
          // Don't fail the activation process due to notification error
        }
      }
      
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Trial activation failed: ${error}`);
      logger.error('Trial activation process failed:', error);
      return result;
    }
  }

  /**
   * @description Activate trial for a single vendor
   * @param {IUser} vendor - The vendor user to activate
   * @param {Date} storeOpeningDate - The store opening date for trial start
   * @security Updates user status and sends activation email
   * @complexity Medium - Single vendor activation with email notification
   * @returns {Promise<void>}
   * @throws {Error} If vendor activation fails
   */
  private static async activateSingleVendorTrial(vendor: IUser, storeOpeningDate: Date): Promise<void> {
    const trialDurationDays = 30; // 30-day trial period
    
    const trialStartDate = new Date(storeOpeningDate);
    const trialEndDate = new Date(storeOpeningDate);
    trialEndDate.setDate(trialEndDate.getDate() + trialDurationDays);

    // Update vendor status
    vendor.registrationStatus = 'trial_active';
    vendor.trialStartDate = trialStartDate;
    vendor.trialEndDate = trialEndDate;
    
    await vendor.save();

    // Send trial activation email
    try {
      await sendTrialActivationEmail(
        vendor.kontakt.email,
        vendor.kontakt.name,
        trialStartDate,
        trialEndDate
      );
    } catch (emailError) {
      logger.error(`Failed to send trial activation email to ${vendor.kontakt.email}:`, emailError);
      // Don't throw - email failure shouldn't block trial activation
    }
  }

  /**
   * @description Manually activate trial for a specific vendor (admin action)
   * @param {string} vendorId - The vendor ID to activate
   * @security Admin-only action, validates vendor existence and status
   * @complexity Medium - Manual activation with validation
   * @returns {Promise<void>}
   * @throws {Error} If vendor not found or invalid status
   */
  static async manuallyActivateVendorTrial(vendorId: string): Promise<void> {
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    if (!vendor.isVendor) {
      throw new Error('User is not a vendor');
    }

    if (vendor.registrationStatus !== 'preregistered') {
      throw new Error(`Cannot activate trial - current status: ${vendor.registrationStatus}`);
    }

    // Use current date as trial start for manual activation
    const trialStartDate = new Date();
    await this.activateSingleVendorTrial(vendor, trialStartDate);
  }

  /**
   * @description Update trial statuses based on current date with automated reminder system
   * @security Processes sensitive user data and sends automated emails
   * @complexity High - Batch processing with multiple reminder types and error handling
   * @returns {Promise<TrialStatusUpdateResult>} Result containing update statistics
   * @throws {Error} If status update process fails
   */
  static async updateTrialStatuses(): Promise<TrialStatusUpdateResult> {
    const result: TrialStatusUpdateResult = {
      success: true,
      updatedCount: 0,
      expiredCount: 0,
      warnings: []
    };

    try {
      const now = new Date();
      
      // Process in batches for better performance
      const batchSize = 50;
      const totalVendors = await User.countDocuments({
        isVendor: true,
        registrationStatus: 'trial_active',
        trialEndDate: { $exists: true, $ne: null }
      });

      logger.info(`Processing ${totalVendors} active trial vendors in batches of ${batchSize}`);
      
      for (let skip = 0; skip < totalVendors; skip += batchSize) {
        const activeTrials = await User.find({
          isVendor: true,
          registrationStatus: 'trial_active',
          trialEndDate: { $exists: true, $ne: null }
        })
        .select('kontakt trialEndDate trialAutomation registrationStatus')
        .skip(skip)
        .limit(batchSize);

        for (const vendor of activeTrials) {
          if (!vendor.trialEndDate) continue;

          const trialEndDate = new Date(vendor.trialEndDate);
          const daysUntilExpiration = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          try {
            // Initialize trial automation if not exists
            if (!vendor.trialAutomation) {
              vendor.trialAutomation = {
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
            }

            // Check if trial has expired
            if (now >= trialEndDate) {
              vendor.registrationStatus = 'trial_expired';
              
              // Send trial expired email if not already sent
              if (!vendor.trialAutomation?.remindersSent?.expirationNotification) {
                try {
                  await this.sendTrialExpiredNotification(vendor);
                  if (vendor.trialAutomation) {
                    vendor.trialAutomation.remindersSent.expirationNotification = true;
                    vendor.trialAutomation.lastReminderSent = now;
                  }
                } catch (emailError) {
                  result.warnings.push(`Failed to send trial expired email to ${vendor.kontakt.email}`);
                }
              }
              
              await vendor.save();
              result.expiredCount++;
              logger.info(`Trial expired for vendor: ${vendor.kontakt.email}`);
            }
            // Check for reminder periods
            else {
              let reminderSent = false;
              
              // 7-day reminder
              if (daysUntilExpiration === 7 && !vendor.trialAutomation?.remindersSent?.sevenDayReminder) {
                try {
                  await this.sendTrialReminder(vendor, 7);
                  if (vendor.trialAutomation) {
                    vendor.trialAutomation.remindersSent.sevenDayReminder = true;
                    vendor.trialAutomation.lastReminderSent = now;
                  }
                  reminderSent = true;
                  logger.info(`Sent 7-day reminder to vendor: ${vendor.kontakt.email}`);
                } catch (emailError) {
                  result.warnings.push(`Failed to send 7-day reminder to ${vendor.kontakt.email}`);
                }
              }
              
              // 3-day reminder
              if (daysUntilExpiration === 3 && !vendor.trialAutomation?.remindersSent?.threeDayReminder) {
                try {
                  await this.sendTrialReminder(vendor, 3);
                  if (vendor.trialAutomation) {
                    vendor.trialAutomation.remindersSent.threeDayReminder = true;
                    vendor.trialAutomation.lastReminderSent = now;
                  }
                  reminderSent = true;
                  logger.info(`Sent 3-day reminder to vendor: ${vendor.kontakt.email}`);
                } catch (emailError) {
                  result.warnings.push(`Failed to send 3-day reminder to ${vendor.kontakt.email}`);
                }
              }
              
              // 1-day reminder
              if (daysUntilExpiration === 1 && !vendor.trialAutomation?.remindersSent?.oneDayReminder) {
                try {
                  await this.sendTrialReminder(vendor, 1);
                  if (vendor.trialAutomation) {
                    vendor.trialAutomation.remindersSent.oneDayReminder = true;
                    vendor.trialAutomation.lastReminderSent = now;
                  }
                  reminderSent = true;
                  logger.info(`Sent 1-day reminder to vendor: ${vendor.kontakt.email}`);
                } catch (emailError) {
                  result.warnings.push(`Failed to send 1-day reminder to ${vendor.kontakt.email}`);
                }
              }
              
              if (reminderSent) {
                await vendor.save();
              }
            }

            result.updatedCount++;
          } catch (error) {
            result.warnings.push(`Failed to update trial status for ${vendor.kontakt.email}: ${error}`);
          }
        }
      }

      logger.info(`Trial status update completed: ${result.updatedCount} checked, ${result.expiredCount} expired`);
      return result;
    } catch (error) {
      result.success = false;
      result.warnings.push(`Trial status update failed: ${error}`);
      logger.error('Trial status update failed:', error);
      return result;
    }
  }


  /**
   * @description Check if store opening has been reached and trials need activation
   * @security Validates store opening settings and user counts
   * @complexity Medium - Store opening validation with trial activation
   * @returns {Promise<boolean>} True if trials were activated, false otherwise
   * @throws {Error} If activation check fails
   */
  static async checkForTrialActivation(): Promise<boolean> {
    try {
      const settings = await Settings.getSettings();
      
      // If store is open and there are pre-registered vendors, activate trials
      if (settings.isStoreOpen()) {
        const preregisteredCount = await User.countDocuments({
          isVendor: true,
          registrationStatus: 'preregistered'
        });

        if (preregisteredCount > 0) {
          logger.info(`Store is open with ${preregisteredCount} pre-registered vendors - activating trials`);
          await this.activateTrialsOnStoreOpening();
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check for trial activation:', error);
      throw error;
    }
  }

  /**
   * @description Send trial reminder email using template system
   * @param {IUser} vendor - The vendor to send reminder to
   * @param {number} daysRemaining - Days remaining in trial
   * @security Sends email to vendor with trial information
   * @complexity Medium - Template compilation and email sending
   * @returns {Promise<void>}
   * @throws {Error} If email sending fails
   */
  private static async sendTrialReminder(vendor: IUser, daysRemaining: number): Promise<void> {
    try {
      // Get the appropriate template based on days remaining
      const templateType = daysRemaining === 7 ? 'trial_7_day_reminder' : 
                          daysRemaining === 3 ? 'trial_3_day_reminder' : 
                          'trial_1_day_reminder';
      
      const template = await EmailTemplate.findOne({ 
        type: templateType,
        isActive: true 
      });

      if (!template) {
        // Fallback to old system if template not found
        await sendTrialExpirationWarning(
          vendor.kontakt.email,
          vendor.kontakt.name,
          vendor.trialEndDate!
        );
        return;
      }

      // Prepare template data
      const templateData = {
        vendorName: vendor.kontakt.name,
        vendorEmail: vendor.kontakt.email,
        trialEndDate: vendor.trialEndDate,
        daysRemaining: daysRemaining,
        loginUrl: `${process.env.FRONTEND_URL}/vendor/login`,
        dashboardUrl: `${process.env.FRONTEND_URL}/vendor/dashboard`,
        contactEmail: process.env.CONTACT_EMAIL || 'info@housnkuh.de',
        currentYear: new Date().getFullYear()
      };

      // Compile and send email
      const compiledSubject = Handlebars.compile(template.subject)(templateData);
      const compiledBody = Handlebars.compile(template.htmlBody)(templateData);

      // Use existing email service
      await this.sendEmailWithTemplate(
        vendor.kontakt.email,
        compiledSubject,
        compiledBody,
        template.textBody ? Handlebars.compile(template.textBody)(templateData) : undefined
      );

    } catch (error) {
      logger.error(`Failed to send trial reminder to ${vendor.kontakt.email}:`, error);
      throw error;
    }
  }

  /**
   * @description Send trial expired notification using template system
   * @param {IUser} vendor - The vendor to send notification to
   * @security Sends email notification about trial expiration
   * @complexity Medium - Template compilation and email sending
   * @returns {Promise<void>}
   * @throws {Error} If email sending fails
   */
  private static async sendTrialExpiredNotification(vendor: IUser): Promise<void> {
    try {
      const template = await EmailTemplate.findOne({ 
        type: 'trial_expired',
        isActive: true 
      });

      if (!template) {
        // Fallback to old system if template not found
        await sendTrialExpiredEmail(
          vendor.kontakt.email,
          vendor.kontakt.name,
          vendor.trialEndDate!
        );
        return;
      }

      // Prepare template data
      const templateData = {
        vendorName: vendor.kontakt.name,
        vendorEmail: vendor.kontakt.email,
        trialEndDate: vendor.trialEndDate,
        renewalUrl: `${process.env.FRONTEND_URL}/vendor/renewal`,
        contactEmail: process.env.CONTACT_EMAIL || 'info@housnkuh.de',
        currentYear: new Date().getFullYear()
      };

      // Compile and send email
      const compiledSubject = Handlebars.compile(template.subject)(templateData);
      const compiledBody = Handlebars.compile(template.htmlBody)(templateData);

      await this.sendEmailWithTemplate(
        vendor.kontakt.email,
        compiledSubject,
        compiledBody,
        template.textBody ? Handlebars.compile(template.textBody)(templateData) : undefined
      );

    } catch (error) {
      logger.error(`Failed to send trial expired notification to ${vendor.kontakt.email}:`, error);
      throw error;
    }
  }

  /**
   * @description Send trial conversion confirmation email
   * @param {IUser} vendor - The vendor who converted
   * @security Updates user tracking and sends confirmation email
   * @complexity Medium - Conversion tracking and email notification
   * @returns {Promise<void>}
   * @throws {Error} If email sending fails
   */
  static async sendTrialConversionConfirmation(vendor: IUser): Promise<void> {
    try {
      const template = await EmailTemplate.findOne({ 
        type: 'trial_conversion_confirmation',
        isActive: true 
      });

      if (!template) {
        logger.warn('Trial conversion confirmation template not found');
        return;
      }

      // Update vendor automation tracking
      if (vendor.trialAutomation) {
        vendor.trialAutomation.trialConversionDate = new Date();
        await vendor.save();
      }

      // Prepare template data
      const templateData = {
        vendorName: vendor.kontakt.name,
        vendorEmail: vendor.kontakt.email,
        conversionDate: new Date(),
        dashboardUrl: `${process.env.FRONTEND_URL}/vendor/dashboard`,
        contactEmail: process.env.CONTACT_EMAIL || 'info@housnkuh.de',
        currentYear: new Date().getFullYear()
      };

      // Compile and send email
      const compiledSubject = Handlebars.compile(template.subject)(templateData);
      const compiledBody = Handlebars.compile(template.htmlBody)(templateData);

      await this.sendEmailWithTemplate(
        vendor.kontakt.email,
        compiledSubject,
        compiledBody,
        template.textBody ? Handlebars.compile(template.textBody)(templateData) : undefined
      );

    } catch (error) {
      logger.error(`Failed to send trial conversion confirmation to ${vendor.kontakt.email}:`, error);
      throw error;
    }
  }

  /**
   * @description Helper method to send email with template
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} htmlBody - HTML email body
   * @param {string} [textBody] - Optional text email body
   * @security Sends email using dynamic import to avoid circular dependencies
   * @complexity Low - Simple email sending wrapper
   * @returns {Promise<void>}
   * @throws {Error} If email sending fails
   */
  private static async sendEmailWithTemplate(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string
  ): Promise<void> {
    // Import email service dynamically to avoid circular dependencies
    const { sendCustomEmail } = await import('../utils/emailService');
    
    await sendCustomEmail({
      to,
      subject,
      html: htmlBody,
      text: textBody
    });
  }

  /**
   * @description Get detailed trial analytics for admin dashboard
   * @security Provides aggregated analytics without exposing individual user data
   * @complexity High - Complex aggregation queries for analytics
   * @returns {Promise<any>} Analytics object with trial statistics
   * @throws {Error} If analytics calculation fails
   */
  static async getTrialAnalytics(): Promise<any> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      // Basic counts
      const basicStats = await this.getTrialStatistics();
      
      // Reminder statistics
      const reminderStats = await User.aggregate([
        {
          $match: {
            isVendor: true,
            registrationStatus: 'trial_active',
            'trialAutomation.remindersSent': { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            sevenDayRemindersSent: {
              $sum: { $cond: ['$trialAutomation.remindersSent.sevenDayReminder', 1, 0] }
            },
            threeDayRemindersSent: {
              $sum: { $cond: ['$trialAutomation.remindersSent.threeDayReminder', 1, 0] }
            },
            oneDayRemindersSent: {
              $sum: { $cond: ['$trialAutomation.remindersSent.oneDayReminder', 1, 0] }
            },
            expirationNotificationsSent: {
              $sum: { $cond: ['$trialAutomation.remindersSent.expirationNotification', 1, 0] }
            }
          }
        }
      ]);

      // Conversion statistics
      const conversionStats = await User.aggregate([
        {
          $match: {
            isVendor: true,
            'trialAutomation.trialConversionDate': { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            totalConversions: { $sum: 1 },
            recentConversions: {
              $sum: {
                $cond: [
                  { $gte: ['$trialAutomation.trialConversionDate', thirtyDaysAgo] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      return {
        basic: basicStats,
        automation: {
          reminders: reminderStats.length > 0 ? reminderStats[0] : {
            sevenDayRemindersSent: 0,
            threeDayRemindersSent: 0,
            oneDayRemindersSent: 0,
            expirationNotificationsSent: 0
          },
          conversions: conversionStats.length > 0 ? conversionStats[0] : {
            totalConversions: 0,
            recentConversions: 0
          }
        },
        timestamp: now
      };
    } catch (error) {
      logger.error('Failed to get trial analytics:', error);
      throw error;
    }
  }

  /**
   * @description Get trial status for a user
   * @param {IUser} user - The user to check trial status for
   * @security Provides user-specific trial information
   * @complexity Low - Simple status calculation
   * @returns {Promise<object>} Trial status object with activity and expiration info
   */
  static async getTrialStatus(user: IUser): Promise<{
    isActive: boolean;
    isExpired: boolean;
    daysRemaining: number;
    canConvert: boolean;
    status: string;
  }> {
    const now = new Date();
    const isActive = user.registrationStatus === 'trial_active';
    const isExpired = user.trialEndDate ? user.trialEndDate <= now : false;
    const daysRemaining = user.trialEndDate ? 
      Math.ceil((user.trialEndDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 0;
    const canConvert = isActive && !isExpired;

    return {
      isActive,
      isExpired,
      daysRemaining: Math.max(0, daysRemaining),
      canConvert,
      status: user.registrationStatus || 'unknown'
    };
  }

  /**
   * @description Convert trial to regular subscription
   * @param {IUser} user - The user to convert
   * @security Updates user subscription status
   * @complexity Medium - Status validation and conversion
   * @returns {Promise<object>} Result object with success status
   */
  static async convertTrialToRegular(user: IUser): Promise<{ success: boolean; message?: string }> {
    if (user.registrationStatus !== 'trial_active') {
      return { success: false, message: 'User is not in trial period' };
    }

    if (user.trialEndDate && user.trialEndDate <= new Date()) {
      return { success: false, message: 'Trial has already expired' };
    }

    try {
      await User.findByIdAndUpdate(user._id, {
        registrationStatus: 'active'
      });

      return { success: true };
    } catch (error) {
      return { success: false, message: 'Failed to convert trial' };
    }
  }

  /**
   * @description Extend trial period for a user
   * @param {IUser} user - The user to extend trial for
   * @param {number} extensionDays - Number of days to extend
   * @security Validates user status and updates trial end date
   * @complexity Medium - Date calculation and validation
   * @returns {Promise<object>} Result object with success status and new end date
   */
  static async extendTrial(user: IUser, extensionDays: number): Promise<{ 
    success: boolean; 
    message?: string; 
    newTrialEndDate?: Date;
  }> {
    if (user.registrationStatus !== 'trial_active') {
      return { success: false, message: 'User is not in trial period' };
    }

    if (extensionDays <= 0) {
      return { success: false, message: 'Extension days must be positive' };
    }

    try {
      const currentEndDate = user.trialEndDate || new Date();
      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + extensionDays);

      await User.findByIdAndUpdate(user._id, {
        trialEndDate: newEndDate
      });

      return { success: true, newTrialEndDate: newEndDate };
    } catch (error) {
      return { success: false, message: 'Failed to extend trial' };
    }
  }

  /**
   * @description Cancel trial for a user
   * @param {IUser} user - The user to cancel trial for
   * @param {string} [reason] - Optional cancellation reason
   * @security Updates user status to cancelled
   * @complexity Medium - Status validation and cancellation
   * @returns {Promise<object>} Result object with success status
   */
  static async cancelTrial(user: IUser, reason?: string): Promise<{ 
    success: boolean; 
    message?: string;
  }> {
    if (user.registrationStatus !== 'trial_active') {
      return { success: false, message: 'User is not in trial period' };
    }

    try {
      await User.findByIdAndUpdate(user._id, {
        registrationStatus: 'cancelled'
      });

      return { success: true };
    } catch (error) {
      return { success: false, message: 'Failed to cancel trial' };
    }
  }

  /**
   * @description Get trial history for a user
   * @param {IUser} user - The user to get history for
   * @security Provides user-specific trial history
   * @complexity Low - Simple history compilation
   * @returns {Promise<Array>} Array of trial history events
   */
  static async getTrialHistory(user: IUser): Promise<Array<{
    event: string;
    date: Date;
    details?: any;
  }>> {
    // For now, return basic history based on user data
    // In a full implementation, this would read from an audit log
    const history = [];

    if (user.trialStartDate) {
      history.push({
        event: 'Trial Started',
        date: user.trialStartDate,
        details: { status: 'trial_active' }
      });
    }

    if (user.registrationStatus === 'cancelled') {
      history.push({
        event: 'Trial Cancelled',
        date: new Date(), // This would be stored separately in a real system
        details: { status: 'cancelled' }
      });
    }

    if (user.registrationStatus === 'active') {
      history.push({
        event: 'Trial Converted',
        date: new Date(), // This would be stored separately in a real system
        details: { status: 'active' }
      });
    }

    return history.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * @description Get trial statistics for admin dashboard
   * @security Provides aggregated statistics without exposing individual data
   * @complexity High - Complex aggregation queries for statistics
   * @returns {Promise<object>} Statistics object with trial counts and conversion rate
   * @throws {Error} If statistics calculation fails
   */
  static async getTrialStatistics(): Promise<{
    totalTrials: number;
    activeTrials: number;
    expiredTrials: number;
    convertedTrials: number;
    cancelledTrials: number;
    conversionRate: number;
  }> {
    const stats = await User.aggregate([
      {
        $match: {
          isVendor: true,
          registrationStatus: { $in: ['trial_active', 'trial_expired', 'cancelled', 'active'] }
        }
      },
      {
        $group: {
          _id: '$registrationStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const statMap = new Map();
    stats.forEach(stat => {
      statMap.set(stat._id, stat.count);
    });

    const activeTrials = statMap.get('trial_active') || 0;
    const expiredTrials = statMap.get('trial_expired') || 0;
    const convertedTrials = statMap.get('active') || 0;
    const cancelledTrials = statMap.get('cancelled') || 0;
    const totalTrials = activeTrials + expiredTrials + convertedTrials + cancelledTrials;

    const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

    return {
      totalTrials,
      activeTrials,
      expiredTrials,
      convertedTrials,
      cancelledTrials,
      conversionRate
    };
  }
}

export default TrialService;