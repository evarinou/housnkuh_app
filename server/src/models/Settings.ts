import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  storeOpening: {
    enabled: boolean;
    openingDate: Date | null;
    openingTime?: string; // Format: "HH:MM" in 24-hour format
    reminderDays: number[];
    lastModified: Date;
    modifiedBy?: string;
  };
  version: number;
  createdAt: Date;
  updatedAt: Date;
  updateStoreOpening(openingDate: Date | null, enabled: boolean, modifiedBy?: string, openingTime?: string): Promise<ISettings>;
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

// Check if store is currently open
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

const Settings = mongoose.model<ISettings, ISettingsModel>('Settings', SettingsSchema);

export default Settings;