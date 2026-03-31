/**
 * @file sync-mietfaecher-to-flourio.ts
 * @purpose One-time migration script to sync existing Mietfächer to FlourIO Warehouses
 * @created 2025-10-16
 * @updated 2026-03-31 — Stock → Warehouse rename
 *
 * Usage:
 *   npm run migrate:mietfaecher-to-flourio -- [options]
 *
 * Options:
 *   --dry-run         Show what would be synced without making changes
 *   --force           Force resync all Mietfächer even if already synced
 *   --batch-size=N    Process N Mietfächer at a time (default: 10)
 */

import mongoose from 'mongoose';
import { flourioClient } from '../src/services/flourio';
import { WarehouseService } from '../src/services/flourio/services/WarehouseService';
import { WarehouseSyncService } from '../src/services/flourio/services/warehouseSyncService';
import Mietfach from '../src/models/Mietfach';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceResync = args.includes('--force');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 10;

async function confirmAction(message: string): Promise<boolean> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(`${message} (yes/no): `, (answer: string) => {
      readline.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  FlourIO Warehouse Synchronization - Mietfächer Migration');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  if (forceResync) {
    console.log('⚡ FORCE MODE - All Mietfächer will be resynced\n');
  }

  console.log(`📦 Batch size: ${batchSize}\n`);

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/housnkuh';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected\n');

    // Verify FlourIO API is accessible
    console.log('🔐 Verifying FlourIO API connection...');
    try {
      await flourioClient.get('/stocks?limit=1');
      console.log('✅ FlourIO API connected\n');
    } catch (error: any) {
      console.error('❌ Failed to connect to FlourIO API:', error.message);
      console.error('Please check your FLOURIO_API_URL and FLOURIO_BEARER_TOKEN in .env');
      process.exit(1);
    }

    // Get sync status
    const warehouseService = new WarehouseService(flourioClient);
    const syncService = new WarehouseSyncService(warehouseService);

    console.log('📊 Getting current sync status...');
    const status = await syncService.getSyncStatus();
    console.log('\nCurrent Status:');
    console.log(`  Total Mietfächer:     ${status.total}`);
    console.log(`  Already synced:       ${status.synced}`);
    console.log(`  Need sync:            ${status.needsSync}`);
    console.log(`  Pending:              ${status.pending}`);
    console.log(`  Errors:               ${status.error}\n`);

    if (status.total === 0) {
      console.log('ℹ️  No Mietfächer found in database. Nothing to sync.');
      await mongoose.connection.close();
      return;
    }

    const toSync = forceResync ? status.total : (status.needsSync + status.pending + status.error);

    if (toSync === 0) {
      console.log('✅ All Mietfächer are already synced. Nothing to do.');
      console.log('   Use --force to resync all Mietfächer.');
      await mongoose.connection.close();
      return;
    }

    // Confirmation prompt
    if (!dryRun) {
      console.log(`⚠️  About to sync ${toSync} Mietfächer to FlourIO Warehouse API`);
      console.log('   This will create/update Warehouse records in FlourIO.\n');

      const confirmed = await confirmAction('Do you want to proceed?');
      if (!confirmed) {
        console.log('\n❌ Migration cancelled by user');
        await mongoose.connection.close();
        return;
      }

      console.log('\n⏳ Starting in 5 seconds... (Ctrl+C to cancel)');
      await delay(5000);
    }

    // Perform sync
    console.log('\n🚀 Starting synchronization...\n');
    const startTime = Date.now();

    const result = await syncService.syncAllMietfaecher({
      forceResync,
      dryRun,
      batchSize
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print results
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Synchronization Complete');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Successfully synced:  ${result.synced}`);
    console.log(`⏭️  Skipped:             ${result.skipped}`);
    console.log(`❌ Failed:               ${result.failed}`);
    console.log(`⏱️  Duration:            ${duration}s\n`);

    if (result.errors.length > 0) {
      console.log('❌ Errors encountered:\n');
      result.errors.forEach((err, idx) => {
        console.log(`${idx + 1}. Mietfach: ${err.mietfachName} (${err.mietfachId})`);
        console.log(`   Error: ${err.error}\n`);
      });
    }

    if (dryRun) {
      console.log('ℹ️  This was a dry run. No changes were made.');
      console.log('   Run without --dry-run to perform actual sync.\n');
    }

    // Final status check
    if (!dryRun && result.synced > 0) {
      console.log('📊 Final sync status...');
      const finalStatus = await syncService.getSyncStatus();
      console.log('\nFinal Status:');
      console.log(`  Total Mietfächer:     ${finalStatus.total}`);
      console.log(`  Synced:               ${finalStatus.synced}`);
      console.log(`  Need sync:            ${finalStatus.needsSync}`);
      console.log(`  Pending:              ${finalStatus.pending}`);
      console.log(`  Errors:               ${finalStatus.error}\n`);
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed');
  }
}

// Run migration
main().catch(console.error);
