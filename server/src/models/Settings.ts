/**
 * @file Settings model for the housnkuh marketplace application
 * @description Global application settings including store opening, monitoring, and feature flags
 * Manages centralized configuration with validation and versioning
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Interface for Settings document with comprehensive configuration options
 * @description Defines structure for application settings with store opening, monitoring, and feature flags
 */
export interface ISettings extends Document {
  storeOpening: {
    enabled: boolean;
    openingDate: Date | null;
    openingTime?: string; // Format: "HH:MM" in 24-hour format
    reminderDays: number[];
    lastModified: Date;
    modifiedBy?: string;
  };
  monitoring: {
    enabled: boolean;
    alerting: {
      enabled: boolean;
      adminEmails: string[];
      cooldownMinutes: number;
      thresholds: {
        responseTime: number; // milliseconds
        errorRate: number; // percentage
        memoryUsage: number; // bytes
        dbResponseTime: number; // milliseconds
        errorFrequency: number; // errors per 5 minutes
      };
    };
    healthChecks: {
      enabled: boolean;
      intervalMinutes: number;
      components: string[]; // ['database', 'email', 'trialService', etc.]
    };
    metrics: {
      enabled: boolean;
      retentionHours: number;
      performanceTracking: boolean;
    };
    lastModified: Date;
    modifiedBy?: string;
  };
  featureFlags: {
    trialAutomation: {
      enabled: boolean;
      emailReminders: boolean;
      autoExpiration: boolean;
      conversionTracking: boolean;
      rolloutPercentage: number;
    };
    monitoring: {
      enabled: boolean;
      trialMetrics: boolean;
      alerting: boolean;
    };
    adminTools: {
      enabled: boolean;
      trialExtension: boolean;
      bulkOperations: boolean;
    };
    lastModified: Date;
    modifiedBy?: string;
  };
  version: number;
  createdAt: Date;
  updatedAt: Date;
  updateStoreOpening(openingDate: Date | null, enabled: boolean, modifiedBy?: string, openingTime?: string): Promise<ISettings>;
  updateMonitoringSettings(monitoringConfig: any, modifiedBy?: string): Promise<ISettings>;
  updateFeatureFlags(featureFlags: any, modifiedBy?: string): Promise<ISettings>;
  isFeatureEnabled(category: string, feature: string): boolean;
  isStoreOpen(): boolean;
  getMonitoringConfig(): any;
}

/**
 * Interface for Settings model with static methods
 * @description Extends Model interface with settings-specific static methods
 */
export interface ISettingsModel extends Model<ISettings> {
  getSettings(): Promise<ISettings>;
}

/**
 * Settings schema with comprehensive configuration management
 * @description Manages global application settings with monitoring, feature flags, and store opening
 */
const SettingsSchema = new Schema<ISettings>({
  storeOpening: {
    enabled: {
      type: Boolean,
      default: false
    },
    openingDate: {
      type: Date,
      default: null
    },
    openingTime: {
      type: String,
      default: '00:00',
      validate: {
        validator: function(v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Opening time must be in HH:MM format (24-hour)'
      }
    },
    reminderDays: {
      type: [Number],
      default: [30, 14, 7, 1]
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    modifiedBy: {
      type: String
    }
  },
  monitoring: {
    enabled: {
      type: Boolean,
      default: true
    },
    alerting: {
      enabled: {
        type: Boolean,
        default: true
      },
      adminEmails: {
        type: [String],
        default: []
      },
      cooldownMinutes: {
        type: Number,
        default: 15
      },
      thresholds: {
        responseTime: {
          type: Number,
          default: 2000 // 2 seconds
        },
        errorRate: {
          type: Number,
          default: 10 // 10%
        },
        memoryUsage: {
          type: Number,
          default: 536870912 // 512MB in bytes
        },
        dbResponseTime: {
          type: Number,
          default: 1000 // 1 second
        },
        errorFrequency: {
          type: Number,
          default: 10 // 10 errors per 5 minutes
        }
      }
    },
    healthChecks: {
      enabled: {
        type: Boolean,
        default: true
      },
      intervalMinutes: {
        type: Number,
        default: 5
      },
      components: {
        type: [String],
        default: ['database', 'email', 'trialService', 'scheduledJobs', 'memory', 'disk']
      }
    },
    metrics: {
      enabled: {
        type: Boolean,
        default: true
      },
      retentionHours: {
        type: Number,
        default: 24
      },
      performanceTracking: {
        type: Boolean,
        default: true
      }
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    modifiedBy: {
      type: String
    }
  },
  featureFlags: {
    trialAutomation: {
      enabled: {
        type: Boolean,
        default: true
      },
      emailReminders: {
        type: Boolean,
        default: true
      },
      autoExpiration: {
        type: Boolean,
        default: true
      },
      conversionTracking: {
        type: Boolean,
        default: true
      },
      rolloutPercentage: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
      }
    },
    monitoring: {
      enabled: {
        type: Boolean,
        default: true
      },
      trialMetrics: {
        type: Boolean,
        default: true
      },
      alerting: {
        type: Boolean,
        default: true
      }
    },
    adminTools: {
      enabled: {
        type: Boolean,
        default: true
      },
      trialExtension: {
        type: Boolean,
        default: true
      },
      bulkOperations: {
        type: Boolean,
        default: true
      }
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    modifiedBy: {
      type: String
    }
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'settings'
});

/**
 * Static method to get or create singleton settings document
 * @description Ensures only one settings document exists in the database
 * @returns Promise<ISettings> - The settings document
 * @complexity O(1) - Single document lookup or creation
 */
SettingsSchema.statics.getSettings = async function(): Promise<ISettings> {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

/**
 * Instance method to update store opening configuration
 * @description Updates store opening date, time, and enabled status with validation
 * @param openingDate - Date when store should open (null for no opening date)
 * @param enabled - Whether store opening feature is enabled
 * @param modifiedBy - Optional username of person making changes
 * @param openingTime - Optional opening time in HH:MM format (24-hour)
 * @returns Promise<ISettings> - Updated settings document
 * @complexity O(1) - Simple field updates and save
 */
SettingsSchema.methods.updateStoreOpening = async function(
  openingDate: Date | null,
  enabled: boolean,
  modifiedBy?: string,
  openingTime?: string
): Promise<ISettings> {
  this.storeOpening.openingDate = openingDate;
  this.storeOpening.enabled = enabled;
  this.storeOpening.lastModified = new Date();
  if (modifiedBy) {
    this.storeOpening.modifiedBy = modifiedBy;
  }
  if (openingTime !== undefined) {
    this.storeOpening.openingTime = openingTime;
  }
  return await this.save();
};

// Update monitoring settings with validation
SettingsSchema.methods.updateMonitoringSettings = async function(
  monitoringConfig: any,
  modifiedBy?: string
): Promise<ISettings> {
  // Merge with existing monitoring settings
  this.monitoring = {
    ...this.monitoring,
    ...monitoringConfig,
    lastModified: new Date(),
    modifiedBy: modifiedBy || this.monitoring.modifiedBy
  };
  
  return await this.save();
};

// Get monitoring configuration for services
SettingsSchema.methods.getMonitoringConfig = function(): any {
  return {
    enabled: this.monitoring.enabled,
    alerting: this.monitoring.alerting,
    healthChecks: this.monitoring.healthChecks,
    metrics: this.monitoring.metrics
  };
};

// Update feature flags with validation
SettingsSchema.methods.updateFeatureFlags = async function(
  featureFlags: any,
  modifiedBy?: string
): Promise<ISettings> {
  // Merge with existing feature flags
  this.featureFlags = {
    ...this.featureFlags,
    ...featureFlags,
    lastModified: new Date(),
    modifiedBy: modifiedBy || this.featureFlags.modifiedBy
  };
  
  return this.save();
};

// Check if a feature is enabled
SettingsSchema.methods.isFeatureEnabled = function(category: string, feature: string): boolean {
  if (!this.featureFlags || !this.featureFlags[category]) {
    return false;
  }
  
  return this.featureFlags[category][feature] === true;
};

/**
 * Instance method to check if store is currently open
 * @description Determines if store is open based on opening date, time, and enabled status
 * @returns boolean - True if store is open, false otherwise
 * @complexity O(1) - Simple date comparisons
 */
SettingsSchema.methods.isStoreOpen = function(): boolean {
  // Wenn Store Opening nicht aktiviert ist, ist der Store sofort offen
  if (!this.storeOpening.enabled) {
    return true;
  }
  
  // Wenn aktiviert aber kein Datum gesetzt, ist der Store noch nicht offen
  if (!this.storeOpening.openingDate) {
    return false;
  }
  
  const now = new Date();
  const openingDate = new Date(this.storeOpening.openingDate);
  
  // If we have a specific opening time, use it
  if (this.storeOpening.openingTime) {
    const [hours, minutes] = this.storeOpening.openingTime.split(':').map(Number);
    openingDate.setHours(hours, minutes, 0, 0);
  } else {
    // Default to midnight if no time specified
    openingDate.setHours(0, 0, 0, 0);
  }
  
  // Check if current time is after the opening date and time
  return now >= openingDate;
};

/**
 * Settings model export
 * @description Exports the Settings model with comprehensive configuration management
 */
const Settings = mongoose.model<ISettings, ISettingsModel>('Settings', SettingsSchema);

export default Settings;