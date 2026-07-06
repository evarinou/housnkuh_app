/**
 * @file Alert.ts
 * @purpose Database model for storing alert history and tracking
 * @created 2025-01-17
 * @modified 2025-01-17
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Interface for Alert document with comprehensive alert information
 * @description Defines structure for alert persistence with history tracking
 */
export interface IAlert extends Document {
  alertId: string;
  ruleId: string;
  type: 'health' | 'performance' | 'error' | 'business';
  severity: 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  notificationsSent: number;
  notificationChannels: {
    email: {
      sent: boolean;
      sentAt?: Date;
      recipients: string[];
      errors?: string[];
    };
    webhook: {
      sent: boolean;
      sentAt?: Date;
      platforms: string[];
      errors?: string[];
    };
    dashboard: {
      sent: boolean;
      sentAt?: Date;
    };
  };
  metadata: {
    correlationId?: string;
    vendorId?: string;
    batchId?: string;
    invoiceId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for Alert model with static methods
 */
export interface IAlertModel extends Model<IAlert> {
  findActiveAlerts(): Promise<IAlert[]>;
  findAlertsBySeverity(severity: 'warning' | 'critical' | 'emergency'): Promise<IAlert[]>;
  findAlertsByTimeRange(startDate: Date, endDate: Date): Promise<IAlert[]>;
  getAlertStatistics(days?: number): Promise<any>;
  cleanupOldAlerts(days?: number): Promise<number>;
}

/**
 * Schema for notification channels tracking
 */
const NotificationChannelsSchema = new Schema({
  email: {
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
    recipients: [{ type: String }],
    errors: [{ type: String }]
  },
  webhook: {
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
    platforms: [{ type: String }],
    errors: [{ type: String }]
  },
  dashboard: {
    sent: { type: Boolean, default: false },
    sentAt: { type: Date }
  }
}, { _id: false });

/**
 * Schema for alert metadata
 */
const MetadataSchema = new Schema({
  correlationId: { type: String },
  vendorId: { type: String },
  batchId: { type: String },
  invoiceId: { type: String }
}, { _id: false });

/**
 * Alert schema with comprehensive tracking and indexing
 */
const AlertSchema = new Schema<IAlert>({
  alertId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ruleId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['health', 'performance', 'error', 'business'],
    index: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['warning', 'critical', 'emergency'],
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  details: {
    type: Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedAt: {
    type: Date,
    index: true
  },
  resolvedBy: {
    type: String
  },
  notificationsSent: {
    type: Number,
    default: 0
  },
  notificationChannels: NotificationChannelsSchema,
  metadata: MetadataSchema
}, {
  timestamps: true,
  collection: 'alerts'
});

// Compound indexes for efficient queries
AlertSchema.index({ resolved: 1, timestamp: -1 });
AlertSchema.index({ type: 1, severity: 1, timestamp: -1 });
AlertSchema.index({ ruleId: 1, timestamp: -1 });
AlertSchema.index({ 'metadata.vendorId': 1, timestamp: -1 });
AlertSchema.index({ 'metadata.batchId': 1, timestamp: -1 });

/**
 * Static method to find active (unresolved) alerts
 */
AlertSchema.statics.findActiveAlerts = function(): Promise<IAlert[]> {
  return this.find({ resolved: false })
    .sort({ timestamp: -1 })
    .limit(100)
    .exec();
};

/**
 * Static method to find alerts by severity
 */
AlertSchema.statics.findAlertsBySeverity = function(severity: 'warning' | 'critical' | 'emergency'): Promise<IAlert[]> {
  return this.find({ severity, resolved: false })
    .sort({ timestamp: -1 })
    .limit(50)
    .exec();
};

/**
 * Static method to find alerts within time range
 */
AlertSchema.statics.findAlertsByTimeRange = function(startDate: Date, endDate: Date): Promise<IAlert[]> {
  return this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  })
    .sort({ timestamp: -1 })
    .exec();
};

/**
 * Static method to get alert statistics
 */
AlertSchema.statics.getAlertStatistics = async function(days: number = 30): Promise<any> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$resolved', false] }, 1, 0]
          }
        },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$resolved', true] }, 1, 0]
          }
        },
        warning: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0]
          }
        },
        critical: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0]
          }
        },
        emergency: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'emergency'] }, 1, 0]
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    total: 0,
    active: 0,
    resolved: 0,
    warning: 0,
    critical: 0,
    emergency: 0
  };
};

/**
 * Static method to cleanup old resolved alerts
 */
AlertSchema.statics.cleanupOldAlerts = function(days: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return this.deleteMany({
    resolved: true,
    resolvedAt: { $lt: cutoffDate }
  }).then((result: any) => result.deletedCount || 0);
};

/**
 * Pre-save middleware to ensure resolvedAt is set when resolved
 */
AlertSchema.pre('save', function(next) {
  if (this.isModified('resolved') && this.resolved && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

export const Alert = mongoose.model<IAlert, IAlertModel>('Alert', AlertSchema);
export default Alert;