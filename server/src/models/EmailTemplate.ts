/**
 * @file Email Template model for the housnkuh marketplace application
 * @description Comprehensive email template management system with versioning and categorization
 * Supports dynamic template rendering with Handlebars variables
 */

import { Schema, model, Document } from 'mongoose';

/**
 * Interface for EmailTemplate document
 * @description Defines structure for email templates with version control and categorization
 */
export interface IEmailTemplate extends Document {
  templateId: string;
  name: string;
  type: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables: string[];
  description?: string;
  isActive: boolean;
  version: number;
  lastModified: Date;
  modifiedBy?: string;
  category: 'vendor' | 'admin' | 'system' | 'notification';
}

/**
 * Email template schema with comprehensive template management
 * @description Manages email templates for various system notifications and user communications
 */
const EmailTemplateSchema = new Schema({
  templateId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // Template-IDs wie 'vendor_registration_confirmation', 'contract_created', etc.
  },
  name: {
    type: String,
    required: true,
    trim: true,
    // Benutzerfreundlicher Name wie "Vendor Registrierung Bestätigung"
  },
  type: {
    type: String,
    required: true,
    enum: [
      'vendor_registration_confirmation',
      'vendor_contest_winner',
      'vendor_contest_not_winner', 
      'contract_created',
      'contract_cancelled',
      'contract_reminder',
      'trial_started',
      'trial_ending',
      'trial_expired',
      // M015 Enhanced trial automation templates
      'trial_activation',
      'trial_7_day_reminder',
      'trial_3_day_reminder',
      'trial_1_day_reminder',
      'trial_conversion_confirmation',
      'admin_notification',
      'newsletter_confirmation',
      'contact_form_received',
      'system_notification',
      // Phase 1 critical templates
      'booking_confirmation',
      'contact_form_admin',
      'contact_form_user_confirmation',
      'newsletter_confirmation_new',
      'trial_activation',
      // Phase 2 vendor lifecycle templates
      'vendor_confirmation',
      'trial_expiration_warning',
      'trial_expired',
      'cancellation_confirmation',
      'admin_confirmation',
      // Phase 3 backend notification templates
      'contract_reminder',
      'system_notification',
      'launch_day_notification',
      'monitoring_alert',
      'admin_notification'
    ]
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  htmlBody: {
    type: String,
    required: true
  },
  textBody: {
    type: String,
    required: false
  },
  variables: [{
    type: String,
    trim: true
    // Liste der verfügbaren Handlebars-Variablen: ['vendorName', 'trialEndDate', etc.]
  }],
  description: {
    type: String,
    trim: true
    // Beschreibung für Admins, wann diese Template verwendet wird
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: String,
    trim: true
    // Username des Admin-Users der die letzte Änderung gemacht hat
  },
  category: {
    type: String,
    enum: ['vendor', 'admin', 'system', 'notification'],
    required: true
  }
}, { 
  timestamps: true,
  collection: 'emailtemplates'
});

/**
 * Pre-update middleware to increment version and update lastModified timestamp
 * @description Automatically increments version number and updates timestamp on template updates
 */
EmailTemplateSchema.pre('findOneAndUpdate', function() {
  this.set({ 
    lastModified: new Date(),
    $inc: { version: 1 }
  });
});

/**
 * Database indexes for query optimization
 * @description Performance-optimized indexes for common query patterns
 */
EmailTemplateSchema.index({ type: 1 });
EmailTemplateSchema.index({ category: 1 });
EmailTemplateSchema.index({ isActive: 1 });

/**
 * EmailTemplate model export
 * @description Exports the EmailTemplate model with versioning and categorization support
 */
export default model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);