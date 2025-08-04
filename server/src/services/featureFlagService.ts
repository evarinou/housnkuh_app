/**
 * @file Feature Flag Service for dynamic feature management
 * @description Service for managing feature flags with caching and rollout capabilities
 * @author System
 * @version 1.0.0
 * @since 2024-01-01
 */

// server/src/services/featureFlagService.ts
import Settings from '../models/Settings';
import { ISettings } from '../models/Settings';

/**
 * @class FeatureFlagService
 * @description Singleton service for managing feature flags with caching and rollout capabilities
 * @security Implements safe feature rollout with percentage-based distribution
 * @complexity Medium - Singleton pattern with caching and rollout logic
 */
class FeatureFlagService {
  private static instance: FeatureFlagService;
  private cachedSettings: ISettings | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  /**
   * @description Get singleton instance of FeatureFlagService
   * @returns {FeatureFlagService} Singleton instance
   * @complexity Low - Singleton pattern implementation
   */
  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * @description Get cached settings or fetch from database
   * @security Caches settings for performance with TTL
   * @complexity Low - Simple caching mechanism
   * @returns {Promise<ISettings>} Settings object
   */
  private async getSettings(): Promise<ISettings> {
    if (this.cachedSettings && Date.now() < this.cacheExpiry) {
      return this.cachedSettings;
    }

    const settings = await Settings.getSettings();
    this.cachedSettings = settings;
    this.cacheExpiry = Date.now() + this.CACHE_TTL;
    return settings;
  }

  /**
   * @description Check if a feature is enabled
   * @param {string} category - Feature category
   * @param {string} feature - Feature name
   * @security Defaults to enabled on error to prevent system lockout
   * @complexity Low - Simple feature flag check
   * @returns {Promise<boolean>} True if feature is enabled
   */
  async isFeatureEnabled(category: string, feature: string): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings.isFeatureEnabled(category, feature);
    } catch (error) {
      console.error('Error checking feature flag:', error);
      // Default to enabled in case of error to prevent system lockout
      return true;
    }
  }

  /**
   * @description Check if trial automation is enabled
   * @security Checks trial automation feature flag
   * @complexity Low - Specific feature flag check
   * @returns {Promise<boolean>} True if trial automation is enabled
   */
  async isTrialAutomationEnabled(): Promise<boolean> {
    return this.isFeatureEnabled('trialAutomation', 'enabled');
  }

  /**
   * @description Check if email reminders are enabled
   * @security Checks email reminder feature flag
   * @complexity Low - Specific feature flag check
   * @returns {Promise<boolean>} True if email reminders are enabled
   */
  async areEmailRemindersEnabled(): Promise<boolean> {
    return this.isFeatureEnabled('trialAutomation', 'emailReminders');
  }

  /**
   * @description Check if auto expiration is enabled
   * @security Checks auto expiration feature flag
   * @complexity Low - Specific feature flag check
   * @returns {Promise<boolean>} True if auto expiration is enabled
   */
  async isAutoExpirationEnabled(): Promise<boolean> {
    return this.isFeatureEnabled('trialAutomation', 'autoExpiration');
  }

  /**
   * @description Check if conversion tracking is enabled
   * @security Checks conversion tracking feature flag
   * @complexity Low - Specific feature flag check
   * @returns {Promise<boolean>} True if conversion tracking is enabled
   */
  async isConversionTrackingEnabled(): Promise<boolean> {
    return this.isFeatureEnabled('trialAutomation', 'conversionTracking');
  }

  /**
   * @description Check if trial monitoring is enabled
   * @security Checks trial monitoring feature flag
   * @complexity Low - Specific feature flag check
   * @returns {Promise<boolean>} True if trial monitoring is enabled
   */
  async isTrialMonitoringEnabled(): Promise<boolean> {
    return this.isFeatureEnabled('monitoring', 'trialMetrics');
  }

  /**
   * @description Check if admin tools are enabled
   * @security Checks admin tools feature flag
   * @complexity Low - Specific feature flag check
   * @returns {Promise<boolean>} True if admin tools are enabled
   */
  async areAdminToolsEnabled(): Promise<boolean> {
    return this.isFeatureEnabled('adminTools', 'enabled');
  }

  /**
   * @description Check if trial extension is enabled
   * @security Checks trial extension feature flag
   * @complexity Low - Specific feature flag check
   * @returns {Promise<boolean>} True if trial extension is enabled
   */
  async isTrialExtensionEnabled(): Promise<boolean> {
    return this.isFeatureEnabled('adminTools', 'trialExtension');
  }

  /**
   * @description Check if bulk operations are enabled
   * @security Checks bulk operations feature flag
   * @complexity Low - Specific feature flag check
   * @returns {Promise<boolean>} True if bulk operations are enabled
   */
  async areBulkOperationsEnabled(): Promise<boolean> {
    return this.isFeatureEnabled('adminTools', 'bulkOperations');
  }

  /**
   * @description Check if a user is included in the rollout (based on percentage)
   * @param {string} userId - User ID to check rollout for
   * @security Uses hash-based distribution for consistent rollout
   * @complexity Medium - Percentage-based rollout with hash distribution
   * @returns {Promise<boolean>} True if user is in rollout
   */
  async isUserInRollout(userId: string): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      const rolloutPercentage = settings.featureFlags?.trialAutomation?.rolloutPercentage || 100;
      
      if (rolloutPercentage >= 100) {
        return true;
      }
      
      if (rolloutPercentage <= 0) {
        return false;
      }
      
      // Use user ID hash to determine if user is in rollout
      const hash = this.hashString(userId);
      const userPercentile = hash % 100;
      
      return userPercentile < rolloutPercentage;
    } catch (error) {
      console.error('Error checking user rollout:', error);
      return true; // Default to enabled
    }
  }

  /**
   * @description Get all feature flags
   * @security Returns all feature flags configuration
   * @complexity Low - Simple feature flag retrieval
   * @returns {Promise<any>} Feature flags object
   */
  async getAllFeatureFlags(): Promise<any> {
    try {
      const settings = await this.getSettings();
      return settings.featureFlags || {};
    } catch (error) {
      console.error('Error getting feature flags:', error);
      return {};
    }
  }

  /**
   * @description Update feature flags
   * @param {any} featureFlags - Feature flags to update
   * @param {string} [modifiedBy] - User performing the update
   * @security Clears cache after update to ensure consistency
   * @complexity Medium - Feature flag update with cache invalidation
   * @returns {Promise<ISettings>} Updated settings
   */
  async updateFeatureFlags(featureFlags: any, modifiedBy?: string): Promise<ISettings> {
    try {
      const settings = await this.getSettings();
      const updatedSettings = await settings.updateFeatureFlags(featureFlags, modifiedBy);
      
      // Clear cache to force refresh
      this.cachedSettings = null;
      this.cacheExpiry = 0;
      
      return updatedSettings;
    } catch (error) {
      console.error('Error updating feature flags:', error);
      throw error;
    }
  }

  /**
   * @description Enable/disable trial automation for gradual rollout
   * @param {boolean} enabled - Whether to enable trial automation
   * @param {number} rolloutPercentage - Percentage of users to roll out to (0-100)
   * @param {string} [modifiedBy] - User performing the update
   * @security Validates rollout percentage bounds
   * @complexity Medium - Rollout configuration with validation
   * @returns {Promise<ISettings>} Updated settings
   * @throws {Error} If rollout percentage is invalid
   */
  async setTrialAutomationRollout(
    enabled: boolean, 
    rolloutPercentage: number = 100,
    modifiedBy?: string
  ): Promise<ISettings> {
    if (rolloutPercentage < 0 || rolloutPercentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    return this.updateFeatureFlags({
      trialAutomation: {
        enabled,
        rolloutPercentage
      }
    }, modifiedBy);
  }

  /**
   * @description Get trial automation status and rollout info
   * @security Provides trial automation configuration details
   * @complexity Medium - Complex status object construction
   * @returns {Promise<object>} Trial automation status object
   */
  async getTrialAutomationStatus(): Promise<{
    enabled: boolean;
    rolloutPercentage: number;
    features: {
      emailReminders: boolean;
      autoExpiration: boolean;
      conversionTracking: boolean;
    };
  }> {
    try {
      const settings = await this.getSettings();
      const trialFlags = settings.featureFlags?.trialAutomation || {};
      
      return {
        enabled: trialFlags.enabled || false,
        rolloutPercentage: trialFlags.rolloutPercentage || 100,
        features: {
          emailReminders: trialFlags.emailReminders || false,
          autoExpiration: trialFlags.autoExpiration || false,
          conversionTracking: trialFlags.conversionTracking || false
        }
      };
    } catch (error) {
      console.error('Error getting trial automation status:', error);
      return {
        enabled: false,
        rolloutPercentage: 0,
        features: {
          emailReminders: false,
          autoExpiration: false,
          conversionTracking: false
        }
      };
    }
  }

  /**
   * @description Clear feature flag cache
   * @security Forces cache refresh on next access
   * @complexity Low - Simple cache clearing
   */
  clearCache(): void {
    this.cachedSettings = null;
    this.cacheExpiry = 0;
  }

  /**
   * @description Simple hash function to distribute users evenly
   * @param {string} str - String to hash
   * @security Uses deterministic hash for consistent user distribution
   * @complexity Low - Simple hash implementation
   * @returns {number} Hash value
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export const featureFlagService = FeatureFlagService.getInstance();