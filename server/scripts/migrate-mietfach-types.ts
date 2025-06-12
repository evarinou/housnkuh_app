// Migration script for updating Mietfach types
// This script adds the new Mietfach types to the database schema
// and ensures existing data compatibility

import mongoose from 'mongoose';
import Mietfach from '../src/models/Mietfach';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';

// Type mapping for backwards compatibility
const typeMapping: Record<string, string> = {
  'vitrine': 'verkaufstisch',  // Map old 'vitrine' to new 'verkaufstisch'
  'tisch': 'verkaufstisch',    // Map old 'tisch' to new 'verkaufstisch'
  'gekuehlt': 'kuehlregal',    // Map old 'gekuehlt' to existing 'kuehlregal'
  'regal-a': 'regal'           // Map old 'regal-a' to existing 'regal'
};

async function migrateMietfachTypes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all existing Mietfächer
    const existingMietfaecher = await Mietfach.find({});
    console.log(`Found ${existingMietfaecher.length} existing Mietfächer`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const mietfach of existingMietfaecher) {
      try {
        const oldType = mietfach.typ;
        
        // Check if type needs to be updated
        if (typeMapping[oldType]) {
          const newType = typeMapping[oldType];
          console.log(`Updating Mietfach ${mietfach.bezeichnung}: ${oldType} -> ${newType}`);
          
          await Mietfach.findByIdAndUpdate(
            mietfach._id,
            { typ: newType },
            { new: true }
          );
          
          updatedCount++;
        } else {
          // Validate that existing type is allowed
          const allowedTypes = ['regal', 'regal-b', 'kuehlregal', 'gefrierregal', 'verkaufstisch', 'sonstiges', 'schaufenster'];
          if (!allowedTypes.includes(oldType)) {
            console.warn(`Warning: Mietfach ${mietfach.bezeichnung} has unknown type '${oldType}'. Consider mapping this type.`);
          }
        }
      } catch (error) {
        console.error(`Error updating Mietfach ${mietfach.bezeichnung}:`, error);
        errorCount++;
      }
    }

    console.log('\nMigration Summary:');
    console.log(`- Total Mietfächer processed: ${existingMietfaecher.length}`);
    console.log(`- Updated: ${updatedCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Unchanged: ${existingMietfaecher.length - updatedCount - errorCount}`);

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Rollback function to undo migration if needed
async function rollbackMietfachTypes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Reverse the type mapping for rollback
    const reverseMapping: Record<string, string> = {
      'verkaufstisch': 'vitrine',  // Rollback to old 'vitrine'
      'kuehlregal': 'gekuehlt',    // Note: This might affect other kuehlregal entries
      'regal': 'regal-a'           // Note: This might affect other regal entries
    };

    const mietfaecher = await Mietfach.find({});
    let rolledBackCount = 0;

    for (const mietfach of mietfaecher) {
      const currentType = mietfach.typ;
      
      if (reverseMapping[currentType]) {
        const oldType = reverseMapping[currentType];
        console.log(`Rolling back Mietfach ${mietfach.bezeichnung}: ${currentType} -> ${oldType}`);
        
        await Mietfach.findByIdAndUpdate(
          mietfach._id,
          { typ: oldType },
          { new: true }
        );
        
        rolledBackCount++;
      }
    }

    console.log(`\nRollback completed. ${rolledBackCount} Mietfächer rolled back.`);
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'migrate') {
  migrateMietfachTypes();
} else if (command === 'rollback') {
  rollbackMietfachTypes();
} else {
  console.log('Usage:');
  console.log('  npm run migrate-types migrate   - Run the migration');
  console.log('  npm run migrate-types rollback  - Rollback the migration');
  process.exit(1);
}