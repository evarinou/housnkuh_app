#!/usr/bin/env node

/**
 * Cleanup Script for Seeded Mietfächer
 * 
 * This script identifies and safely removes automatically seeded Mietfächer
 * while preserving manually created ones and those with active contracts.
 * 
 * Sprint: S12_M11_Mietfaecher_Seeding_Cleanup
 * Task: T01_S12A_Database_Cleanup
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Lade Umgebungsvariablen
dotenv.config();

// Schema definitions (matching the existing seed scripts)
const MietfachSchema = new mongoose.Schema({
  bezeichnung: { type: String, required: true },
  typ: { type: String, required: true },
  groesse: String // Legacy field from old seeds
}, { timestamps: true });

const ServiceSchema = new mongoose.Schema({
  mietfach: { type: mongoose.Schema.Types.ObjectId, ref: 'Mietfach', required: true },
  mietbeginn: { type: Date, required: true },
  mietende: { type: Date },
  monatspreis: { type: Number, required: true }
});

const VertragSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  datum: { type: Date, default: Date.now },
  services: [ServiceSchema]
}, { timestamps: true });

// Models
const Mietfach = mongoose.model('Mietfach', MietfachSchema);
const Vertrag = mongoose.model('Vertrag', VertragSchema);

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Known seeded Mietfächer patterns from seed-db.js analysis
const SEEDED_PATTERNS = [
  { bezeichnung: 'Mietfach A1', typ: 'Standard' },
  { bezeichnung: 'Mietfach B2', typ: 'Premium' },
  { bezeichnung: 'Mietfach C3', typ: 'Standard' },
  { bezeichnung: 'Mietfach D4', typ: 'Premium' }
];

// Additional identification criteria
const SEEDED_CRITERIA = {
  // Standard naming patterns
  standardNames: /^Mietfach [A-Z]\d+$/,
  // Old type values (not enum)
  legacyTypes: ['Standard', 'Premium'],
  // Likely seed creation timeframe (adjust as needed)
  bulkCreationWindow: 60000 // 1 minute window for bulk creation
};

async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

async function createBackup() {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `mietfaecher-backup-${timestamp}.json`);

    // Get all Mietfächer
    const allMietfaecher = await Mietfach.find({}).lean();
    
    // Save backup
    fs.writeFileSync(backupFile, JSON.stringify(allMietfaecher, null, 2));
    
    console.log(`✅ Backup created: ${backupFile}`);
    console.log(`📊 Backed up ${allMietfaecher.length} Mietfächer`);
    
    return backupFile;
  } catch (error) {
    console.error('❌ Backup creation failed:', error.message);
    throw error;
  }
}

async function identifySeededMietfaecher() {
  console.log('🔍 Identifying seeded Mietfächer...');
  
  const candidates = [];
  
  // Get all Mietfächer
  const allMietfaecher = await Mietfach.find({}).lean();
  console.log(`📊 Total Mietfächer in database: ${allMietfaecher.length}`);
  
  // Check for exact pattern matches
  for (const pattern of SEEDED_PATTERNS) {
    const matches = allMietfaecher.filter(m => 
      m.bezeichnung === pattern.bezeichnung && 
      m.typ === pattern.typ
    );
    candidates.push(...matches);
  }
  
  // Check for standard naming patterns
  const nameMatches = allMietfaecher.filter(m => 
    SEEDED_CRITERIA.standardNames.test(m.bezeichnung) &&
    SEEDED_CRITERIA.legacyTypes.includes(m.typ || m.groesse)
  );
  
  // Merge candidates (remove duplicates)
  const seenIds = new Set();
  const uniqueCandidates = [...candidates, ...nameMatches].filter(m => {
    if (seenIds.has(m._id.toString())) return false;
    seenIds.add(m._id.toString());
    return true;
  });
  
  // Check for bulk creation (items created within time window)
  if (allMietfaecher.length > 1) {
    const creationTimes = allMietfaecher.map(m => new Date(m.createdAt || m._id.getTimestamp()));
    const sortedTimes = creationTimes.sort((a, b) => a - b);
    
    // Find groups created within short time windows
    for (let i = 0; i < sortedTimes.length - 1; i++) {
      const timeDiff = sortedTimes[i + 1] - sortedTimes[i];
      if (timeDiff <= SEEDED_CRITERIA.bulkCreationWindow) {
        const bulkItems = allMietfaecher.filter(m => {
          const createTime = new Date(m.createdAt || m._id.getTimestamp());
          return Math.abs(createTime - sortedTimes[i]) <= SEEDED_CRITERIA.bulkCreationWindow;
        });
        uniqueCandidates.push(...bulkItems.filter(m => !seenIds.has(m._id.toString())));
      }
    }
  }
  
  if (VERBOSE) {
    console.log(`🔍 Found ${uniqueCandidates.length} potential seeded Mietfächer:`);
    uniqueCandidates.forEach(m => {
      console.log(`  - ${m.bezeichnung} (${m.typ || m.groesse}) - Created: ${m.createdAt || 'Unknown'}`);
    });
  }
  
  return uniqueCandidates;
}

async function performSafetyChecks(candidates) {
  console.log('🛡️  Performing safety checks...');
  
  const safeToDelete = [];
  const unsafe = [];
  
  for (const mietfach of candidates) {
    const mietfachId = mietfach._id;
    
    // Check for active contracts
    const contracts = await Vertrag.find({ mietfach: mietfachId });
    
    if (contracts.length > 0) {
      unsafe.push({
        mietfach,
        reason: `Has ${contracts.length} contract(s)`,
        contracts: contracts.map(c => ({
          id: c._id,
          status: c.status,
          startDate: c.startDatum,
          endDate: c.endDatum
        }))
      });
    } else {
      safeToDelete.push(mietfach);
    }
  }
  
  console.log(`✅ Safe to delete: ${safeToDelete.length}`);
  console.log(`⚠️  Unsafe (has contracts): ${unsafe.length}`);
  
  if (VERBOSE && unsafe.length > 0) {
    console.log('\n⚠️  Unsafe Mietfächer (will be preserved):');
    unsafe.forEach(item => {
      console.log(`  - ${item.mietfach.bezeichnung}: ${item.reason}`);
      item.contracts.forEach(c => {
        console.log(`    Contract ${c.id}: ${c.status} (${c.startDate} - ${c.endDate})`);
      });
    });
  }
  
  return { safeToDelete, unsafe };
}

async function performCleanup(safeToDelete) {
  if (safeToDelete.length === 0) {
    console.log('ℹ️  No Mietfächer to delete.');
    return { deletedCount: 0, deletedItems: [] };
  }
  
  if (DRY_RUN) {
    console.log(`🔍 DRY RUN: Would delete ${safeToDelete.length} Mietfächer:`);
    safeToDelete.forEach(m => {
      console.log(`  - ${m.bezeichnung} (${m.typ || m.groesse})`);
    });
    return { deletedCount: 0, deletedItems: safeToDelete };
  }
  
  console.log(`🗑️  Deleting ${safeToDelete.length} seeded Mietfächer...`);
  
  const idsToDelete = safeToDelete.map(m => m._id);
  const result = await Mietfach.deleteMany({ _id: { $in: idsToDelete } });
  
  console.log(`✅ Deleted ${result.deletedCount} Mietfächer`);
  
  return {
    deletedCount: result.deletedCount,
    deletedItems: safeToDelete
  };
}

function generateReport(backupFile, candidates, safetyCheck, cleanup) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    operation: DRY_RUN ? 'DRY_RUN' : 'CLEANUP',
    backup: backupFile,
    summary: {
      totalCandidates: candidates.length,
      safeToDelete: safetyCheck.safeToDelete.length,
      unsafeToDelete: safetyCheck.unsafe.length,
      actuallyDeleted: cleanup.deletedCount
    },
    candidates: candidates.map(m => ({
      id: m._id,
      bezeichnung: m.bezeichnung,
      typ: m.typ || m.groesse,
      createdAt: m.createdAt
    })),
    unsafe: safetyCheck.unsafe,
    deleted: cleanup.deletedItems.map(m => ({
      id: m._id,
      bezeichnung: m.bezeichnung,
      typ: m.typ || m.groesse
    }))
  };
  
  const reportFile = path.join(BACKUP_DIR, `cleanup-report-${timestamp.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`📊 Report saved: ${reportFile}`);
  return report;
}

async function main() {
  console.log('🚀 Starting Mietfächer Cleanup Process');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE CLEANUP'}`);
  console.log('─'.repeat(50));
  
  try {
    // Connect to database
    await connectDatabase();
    
    // Create backup
    const backupFile = await createBackup();
    
    // Identify candidates
    const candidates = await identifySeededMietfaecher();
    
    if (candidates.length === 0) {
      console.log('✅ No seeded Mietfächer found. Database is clean.');
      return;
    }
    
    // Perform safety checks
    const safetyCheck = await performSafetyChecks(candidates);
    
    // Perform cleanup
    const cleanup = await performCleanup(safetyCheck.safeToDelete);
    
    // Generate report
    const report = generateReport(backupFile, candidates, safetyCheck, cleanup);
    
    console.log('\n📊 CLEANUP SUMMARY');
    console.log('─'.repeat(30));
    console.log(`Total candidates found: ${report.summary.totalCandidates}`);
    console.log(`Safe to delete: ${report.summary.safeToDelete}`);
    console.log(`Unsafe (preserved): ${report.summary.unsafeToDelete}`);
    console.log(`Actually deleted: ${report.summary.actuallyDeleted}`);
    
    if (DRY_RUN) {
      console.log('\n💡 This was a DRY RUN. No data was actually deleted.');
      console.log('   Run without --dry-run to perform actual cleanup.');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    if (VERBOSE) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
  }
}

// Script usage help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Mietfächer Cleanup Script

Usage: node cleanup-seeded-mietfaecher.js [options]

Options:
  --dry-run     Show what would be deleted without actually deleting
  --verbose     Show detailed output
  --help, -h    Show this help message

Environment Variables:
  MONGO_URI     MongoDB connection string (default: mongodb://localhost:27017/housnkuh)

Examples:
  node cleanup-seeded-mietfaecher.js --dry-run --verbose
  MONGO_URI=mongodb://localhost:27017/housnkuh node cleanup-seeded-mietfaecher.js
`);
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, identifySeededMietfaecher, performSafetyChecks };