// server/src/migrations/003_add_trial_automation_fields.ts
import mongoose from 'mongoose';
import User from '../models/User';

/**
 * Migration to add trial automation fields to existing users
 * Sprint S18 - M015 Backend Foundation
 */
export async function up(): Promise<void> {
  console.log('🔄 Running migration: Adding trial automation fields to User model...');
  
  try {
    // Update all existing vendor users to include trial automation fields
    const updateResult = await User.updateMany(
      { isVendor: true },
      {
        $set: {
          'trialAutomation.emailsAutomated': true,
          'trialAutomation.remindersSent.sevenDayReminder': false,
          'trialAutomation.remindersSent.threeDayReminder': false,
          'trialAutomation.remindersSent.oneDayReminder': false,
          'trialAutomation.remindersSent.expirationNotification': false,
          'trialAutomation.lastReminderSent': null,
          'trialAutomation.trialConversionDate': null,
          'trialAutomation.automationNotes': ''
        }
      }
    );
    
    console.log(`✅ Migration completed: Updated ${updateResult.modifiedCount} vendor users`);
    
    // Create indexes for better performance
    await User.collection.createIndex({ 
      'trialAutomation.remindersSent.sevenDayReminder': 1,
      'registrationStatus': 1,
      'trialEndDate': 1
    });
    
    await User.collection.createIndex({ 
      'trialAutomation.lastReminderSent': 1,
      'registrationStatus': 1
    });
    
    console.log('✅ Indexes created for trial automation fields');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback migration - remove trial automation fields
 */
export async function down(): Promise<void> {
  console.log('🔄 Rolling back migration: Removing trial automation fields...');
  
  try {
    // Remove trial automation fields from all users
    const updateResult = await User.updateMany(
      {},
      {
        $unset: {
          'trialAutomation': ''
        }
      }
    );
    
    console.log(`✅ Rollback completed: Updated ${updateResult.modifiedCount} users`);
    
    // Drop indexes
    try {
      await User.collection.dropIndex('trialAutomation.remindersSent.sevenDayReminder_1_registrationStatus_1_trialEndDate_1');
      await User.collection.dropIndex('trialAutomation.lastReminderSent_1_registrationStatus_1');
      console.log('✅ Indexes dropped');
    } catch (indexError) {
      console.warn('⚠️ Could not drop indexes (may not exist):', indexError);
    }
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Migration metadata
export const metadata = {
  version: '003',
  name: 'add_trial_automation_fields',
  description: 'Add trial automation tracking fields to User model',
  sprint: 'S18_M015_Backend_Foundation',
  date: new Date('2024-01-15')
};