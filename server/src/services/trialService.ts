// server/src/services/trialService.ts
import User from '../models/User';
import Settings from '../models/Settings';
import { sendTrialActivationEmail, sendTrialExpirationWarning, sendTrialExpiredEmail } from '../utils/emailService';
import { IUser } from '../types/modelTypes';

export interface TrialActivationResult {
  success: boolean;
  activatedCount: number;
  failedCount: number;
  errors: string[];
}

export interface TrialStatusUpdateResult {
  success: boolean;
  updatedCount: number;
  expiredCount: number;
  warnings: string[];
}

/**
 * Service for managing trial period activation and status tracking
 * Implements R003 (Trial Period Activation) and R008 (Trial Status Tracking)
 */
export class TrialService {
  
  /**
   * Activate trials for all pre-registered vendors when store opens
   * Called automatically when store opening date is reached
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

      console.log(`Found ${preregisteredVendors.length} pre-registered vendors to activate`);

      // Activate each vendor's trial
      for (const vendor of preregisteredVendors) {
        try {
          await this.activateSingleVendorTrial(vendor, openingDate);
          result.activatedCount++;
          
          console.log(`Activated trial for vendor: ${vendor.kontakt.email}`);
        } catch (error) {
          result.failedCount++;
          result.errors.push(`Failed to activate trial for ${vendor.kontakt.email}: ${error}`);
          console.error(`Failed to activate trial for vendor ${vendor.kontakt.email}:`, error);
        }
      }

      // Log summary
      console.log(`Trial activation completed: ${result.activatedCount} activated, ${result.failedCount} failed`);
      
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Trial activation failed: ${error}`);
      console.error('Trial activation process failed:', error);
      return result;
    }
  }

  /**
   * Activate trial for a single vendor
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
      console.error(`Failed to send trial activation email to ${vendor.kontakt.email}:`, emailError);
      // Don't throw - email failure shouldn't block trial activation
    }
  }

  /**
   * Manually activate trial for a specific vendor (admin action)
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
   * Update trial statuses based on current date
   * Should be run daily via scheduled job
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
      
      // Find all active trials
      const activeTrials = await User.find({
        isVendor: true,
        registrationStatus: 'trial_active',
        trialEndDate: { $exists: true, $ne: null }
      });

      for (const vendor of activeTrials) {
        if (!vendor.trialEndDate) continue;

        const trialEndDate = new Date(vendor.trialEndDate);
        const daysUntilExpiration = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        try {
          // Check if trial has expired
          if (now >= trialEndDate) {
            vendor.registrationStatus = 'trial_expired';
            await vendor.save();
            result.expiredCount++;

            // Send trial expired email
            try {
              await sendTrialExpiredEmail(
                vendor.kontakt.email,
                vendor.kontakt.name,
                trialEndDate
              );
            } catch (emailError) {
              result.warnings.push(`Failed to send trial expired email to ${vendor.kontakt.email}`);
            }

            console.log(`Trial expired for vendor: ${vendor.kontakt.email}`);
          }
          // Check if trial expires in 7 days (warning)
          else if (daysUntilExpiration === 7) {
            try {
              await sendTrialExpirationWarning(
                vendor.kontakt.email,
                vendor.kontakt.name,
                trialEndDate
              );
            } catch (emailError) {
              result.warnings.push(`Failed to send trial warning email to ${vendor.kontakt.email}`);
            }

            console.log(`Sent 7-day warning to vendor: ${vendor.kontakt.email}`);
          }

          result.updatedCount++;
        } catch (error) {
          result.warnings.push(`Failed to update trial status for ${vendor.kontakt.email}: ${error}`);
        }
      }

      console.log(`Trial status update completed: ${result.updatedCount} checked, ${result.expiredCount} expired`);
      return result;
    } catch (error) {
      result.success = false;
      result.warnings.push(`Trial status update failed: ${error}`);
      console.error('Trial status update failed:', error);
      return result;
    }
  }

  /**
   * Get trial statistics for admin dashboard
   */
  static async getTrialStatistics() {
    try {
      const [preregistered, active, expired, cancelled] = await Promise.all([
        User.countDocuments({ isVendor: true, registrationStatus: 'preregistered' }),
        User.countDocuments({ isVendor: true, registrationStatus: 'trial_active' }),
        User.countDocuments({ isVendor: true, registrationStatus: 'trial_expired' }),
        User.countDocuments({ isVendor: true, registrationStatus: 'cancelled' })
      ]);

      return {
        preregistered,
        active,
        expired,
        cancelled,
        total: preregistered + active + expired + cancelled
      };
    } catch (error) {
      console.error('Failed to get trial statistics:', error);
      throw error;
    }
  }

  /**
   * Check if store opening has been reached and trials need activation
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
          console.log(`Store is open with ${preregisteredCount} pre-registered vendors - activating trials`);
          await this.activateTrialsOnStoreOpening();
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to check for trial activation:', error);
      throw error;
    }
  }
}

export default TrialService;