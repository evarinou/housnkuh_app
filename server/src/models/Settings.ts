import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  storeOpening: {
    enabled: boolean;
    openingDate: Date | null;
    reminderDays: number[];
    lastModified: Date;
    modifiedBy?: string;
  };
  version: number;
  createdAt: Date;
  updatedAt: Date;
  updateStoreOpening(openingDate: Date | null, enabled: boolean, modifiedBy?: string): Promise<ISettings>;
  isStoreOpen(): boolean;
}

export interface ISettingsModel extends Model<ISettings> {
  getSettings(): Promise<ISettings>;
}

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
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'settings'
});

// Ensure only one settings document exists
SettingsSchema.statics.getSettings = async function(): Promise<ISettings> {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Update store opening with validation
SettingsSchema.methods.updateStoreOpening = async function(
  openingDate: Date | null,
  enabled: boolean,
  modifiedBy?: string
): Promise<ISettings> {
  this.storeOpening.openingDate = openingDate;
  this.storeOpening.enabled = enabled;
  this.storeOpening.lastModified = new Date();
  if (modifiedBy) {
    this.storeOpening.modifiedBy = modifiedBy;
  }
  return await this.save();
};

// Check if store is currently open
SettingsSchema.methods.isStoreOpen = function(): boolean {
  if (!this.storeOpening.enabled || !this.storeOpening.openingDate) {
    return false;
  }
  return new Date() >= new Date(this.storeOpening.openingDate);
};

const Settings = mongoose.model<ISettings, ISettingsModel>('Settings', SettingsSchema);

export default Settings;