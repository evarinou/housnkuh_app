import Mietfach from '../models/Mietfach';

/**
 * Migration: Add creation tracking to existing Mietfächer
 * Sprint: S12_M11_Mietfaecher_Seeding_Cleanup
 * 
 * This migration adds creationSource field to existing Mietfächer
 * and marks all existing entries as 'seed' since they were created
 * before the manual tracking system was implemented.
 */

export async function up(): Promise<void> {
  console.log('🚀 Starting migration: Add Mietfach creation tracking');
  
  try {
    // Find all Mietfächer that don't have creationSource set
    const existingMietfaecher = await Mietfach.find({ 
      creationSource: { $exists: false } 
    });
    
    console.log(`📊 Found ${existingMietfaecher.length} existing Mietfächer without creation tracking`);
    
    if (existingMietfaecher.length === 0) {
      console.log('✅ No Mietfächer need migration');
      return;
    }
    
    // Mark all existing Mietfächer as 'seed' source
    const result = await Mietfach.updateMany(
      { creationSource: { $exists: false } },
      { 
        $set: { 
          creationSource: 'seed',
          // createdBy is left null for seed data as no specific admin created them
        }
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} Mietfächer with creation tracking`);
    console.log('   - All existing Mietfächer marked as "seed" source');
    console.log('   - New Mietfächer will be marked as "manual" by default');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  console.log('🔄 Rolling back migration: Remove Mietfach creation tracking');
  
  try {
    // Remove the creationSource and createdBy fields
    const result = await Mietfach.updateMany(
      {},
      { 
        $unset: { 
          creationSource: '',
          createdBy: ''
        }
      }
    );
    
    console.log(`✅ Removed creation tracking from ${result.modifiedCount} Mietfächer`);
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}
// Standardformat für den migrationRunner ({ version, name, up, down })
export default {
  version: 6,
  name: 'add_mietfach_creation_tracking',
  up,
  down
};
