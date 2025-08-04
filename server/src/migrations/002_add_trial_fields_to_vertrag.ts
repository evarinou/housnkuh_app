import mongoose from 'mongoose';
import { MongoClient, Db } from 'mongodb';

interface MigrationResult {
  success: boolean;
  message: string;
  modifiedCount?: number;
}

/**
 * Migration to add trial period fields to existing Vertrag documents
 * This migration adds the new trial-related fields with appropriate defaults
 */
export class AddTrialFieldsToVertragMigration {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async up(): Promise<MigrationResult> {
    try {
      console.log('Starting migration: Add trial fields to Vertrag collection...');

      // Update all existing contracts with trial fields
      const updateResult = await this.db.collection('vertrags').updateMany(
        {}, // Update all documents
        {
          $set: {
            istProbemonatBuchung: false,
            gekuendigtInProbemonat: false,
            // Set zahlungspflichtigAb to scheduledStartDate for existing contracts
            zahlungspflichtigAb: { $ifNull: ['$scheduledStartDate', '$datum'] }
          }
        }
      );

      console.log(`Updated ${updateResult.modifiedCount} contracts with trial fields`);

      // Create indexes for efficient queries
      await this.createIndexes();

      return {
        success: true,
        message: `Successfully added trial fields to ${updateResult.modifiedCount} contracts and created indexes`,
        modifiedCount: updateResult.modifiedCount
      };
    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async down(): Promise<MigrationResult> {
    try {
      console.log('Starting rollback: Remove trial fields from Vertrag collection...');

      // Remove trial fields from all documents
      const updateResult = await this.db.collection('vertrags').updateMany(
        {},
        {
          $unset: {
            istProbemonatBuchung: '',
            probemonatUserId: '',
            zahlungspflichtigAb: '',
            gekuendigtInProbemonat: '',
            probemonatKuendigungsdatum: ''
          }
        }
      );

      console.log(`Removed trial fields from ${updateResult.modifiedCount} contracts`);

      // Drop trial-related indexes
      await this.dropIndexes();

      return {
        success: true,
        message: `Successfully removed trial fields from ${updateResult.modifiedCount} contracts and dropped indexes`,
        modifiedCount: updateResult.modifiedCount
      };
    } catch (error) {
      console.error('Rollback failed:', error);
      return {
        success: false,
        message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async createIndexes(): Promise<void> {
    const collection = this.db.collection('vertrags');

    // Create indexes for trial and revenue queries
    const indexes: Array<{ key: Record<string, number>; name: string }> = [
      { key: { istProbemonatBuchung: 1 }, name: 'idx_istProbemonatBuchung' },
      { key: { zahlungspflichtigAb: 1 }, name: 'idx_zahlungspflichtigAb' },
      { 
        key: { istProbemonatBuchung: 1, zahlungspflichtigAb: 1 }, 
        name: 'idx_trial_payment_compound' 
      },
      { key: { probemonatUserId: 1 }, name: 'idx_probemonatUserId' },
      { key: { gekuendigtInProbemonat: 1 }, name: 'idx_gekuendigtInProbemonat' }
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index.key, { name: index.name });
        console.log(`Created index: ${index.name}`);
      } catch (error) {
        // Index might already exist, which is fine
        if (error instanceof Error && !error.message.includes('already exists')) {
          console.warn(`Failed to create index ${index.name}:`, error.message);
        }
      }
    }
  }

  private async dropIndexes(): Promise<void> {
    const collection = this.db.collection('vertrags');

    const indexesToDrop = [
      'idx_istProbemonatBuchung',
      'idx_zahlungspflichtigAb',
      'idx_trial_payment_compound',
      'idx_probemonatUserId',
      'idx_gekuendigtInProbemonat'
    ];

    for (const indexName of indexesToDrop) {
      try {
        await collection.dropIndex(indexName);
        console.log(`Dropped index: ${indexName}`);
      } catch (error) {
        // Index might not exist, which is fine during rollback
        if (error instanceof Error && !error.message.includes('not found')) {
          console.warn(`Failed to drop index ${indexName}:`, error.message);
        }
      }
    }
  }

  /**
   * Validate the migration by checking if all contracts have the required fields
   */
  async validate(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if all contracts have the required trial fields
      const contractsWithoutTrialFields = await this.db.collection('vertrags').countDocuments({
        $or: [
          { istProbemonatBuchung: { $exists: false } },
          { zahlungspflichtigAb: { $exists: false } },
          { gekuendigtInProbemonat: { $exists: false } }
        ]
      });

      if (contractsWithoutTrialFields > 0) {
        issues.push(`${contractsWithoutTrialFields} contracts are missing required trial fields`);
      }

      // Check for invalid trial bookings (must have probemonatUserId if istProbemonatBuchung is true)
      const invalidTrialBookings = await this.db.collection('vertrags').countDocuments({
        istProbemonatBuchung: true,
        probemonatUserId: { $exists: false }
      });

      if (invalidTrialBookings > 0) {
        issues.push(`${invalidTrialBookings} trial bookings are missing probemonatUserId`);
      }

      // Check for invalid cancellation data
      const invalidCancellations = await this.db.collection('vertrags').countDocuments({
        gekuendigtInProbemonat: true,
        probemonatKuendigungsdatum: { $exists: false }
      });

      if (invalidCancellations > 0) {
        issues.push(`${invalidCancellations} cancelled trial bookings are missing cancellation date`);
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        issues
      };
    }
  }
}

/**
 * Run the migration
 */
export async function runTrialFieldsMigration(mongoUrl: string): Promise<MigrationResult> {
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    const db = client.db();
    
    const migration = new AddTrialFieldsToVertragMigration(db);
    const result = await migration.up();
    
    if (result.success) {
      // Validate the migration
      const validation = await migration.validate();
      if (!validation.isValid) {
        console.warn('Migration validation found issues:', validation.issues);
        result.message += '. Validation warnings: ' + validation.issues.join(', ');
      }
    }
    
    return result;
  } finally {
    await client.close();
  }
}

/**
 * Rollback the migration
 */
export async function rollbackTrialFieldsMigration(mongoUrl: string): Promise<MigrationResult> {
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    const db = client.db();
    
    const migration = new AddTrialFieldsToVertragMigration(db);
    return await migration.down();
  } finally {
    await client.close();
  }
}

// Export for direct usage
export default AddTrialFieldsToVertragMigration;