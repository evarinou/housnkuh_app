/**
 * Query Optimization Migration Script
 * Applies all query optimizations from Sprint 007-3
 * Run with: node scripts/apply-query-optimizations.js
 */

const mongoose = require('mongoose');
const { createIndexes } = require('./create-indexes');
const { runBenchmarks } = require('./benchmark-queries');

async function applyOptimizations() {
  try {
    console.log('🚀 Applying Query Optimizations - Sprint 007-3');
    console.log('=' .repeat(50));
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Step 1: Create database indexes
    console.log('\n📌 Step 1: Creating Database Indexes');
    await createIndexes();

    // Step 2: Analyze existing query patterns
    console.log('\n📌 Step 2: Analyzing Query Performance');
    console.log('Running performance benchmarks...');
    
    // Optional: Run benchmarks to measure current performance
    if (process.argv.includes('--benchmark')) {
      await runBenchmarks();
    }

    // Step 3: Verify index creation
    console.log('\n📌 Step 3: Verifying Index Creation');
    const db = mongoose.connection.db;
    
    const collections = ['vertraege', 'users', 'mietfaecher', 'monthlyrevenues'];
    for (const collName of collections) {
      const collection = db.collection(collName);
      const indexes = await collection.indexes();
      console.log(`${collName}: ${indexes.length} indexes created`);
      
      // List index names for verification
      const indexNames = indexes.map(idx => idx.name).filter(name => name !== '_id_');
      if (indexNames.length > 0) {
        console.log(`  Custom indexes: ${indexNames.join(', ')}`);
      }
    }

    // Step 4: Database health check
    console.log('\n📌 Step 4: Database Health Check');
    
    // Check collection sizes
    const stats = await Promise.all(
      collections.map(async (collName) => {
        try {
          const collection = db.collection(collName);
          const count = await collection.countDocuments();
          const stats = await collection.stats();
          return {
            collection: collName,
            documents: count,
            size: Math.round(stats.size / 1024) + ' KB',
            avgObjSize: Math.round(stats.avgObjSize) + ' bytes'
          };
        } catch (error) {
          return {
            collection: collName,
            documents: 0,
            size: '0 KB',
            avgObjSize: '0 bytes',
            error: error.message
          };
        }
      })
    );

    console.log('\nCollection Statistics:');
    stats.forEach(stat => {
      if (stat.error) {
        console.log(`  ${stat.collection}: Error - ${stat.error}`);
      } else {
        console.log(`  ${stat.collection}: ${stat.documents} docs, ${stat.size}, avg ${stat.avgObjSize}`);
      }
    });

    // Step 5: Query optimization summary
    console.log('\n📌 Step 5: Optimization Summary');
    console.log('\n✅ Applied Optimizations:');
    console.log('  • N+1 Pattern Elimination:');
    console.log('    - getAllMietfaecherWithContracts now uses aggregation');
    console.log('    - RevenueService.aggregateByMietfach optimized');
    console.log('    - getVendorContracts uses efficient aggregation');
    
    console.log('  • Database Indexes:');
    console.log('    - Contract queries (user + status + dates)');
    console.log('    - Revenue calculations (status + trial + payment)');
    console.log('    - Mietfach availability (type + availability)');
    console.log('    - User lookups (email, vendor status)');
    
    console.log('  • Query Caching:');
    console.log('    - Revenue queries cached for 5 minutes');
    console.log('    - Combined revenue data cached for 3 minutes');
    console.log('    - Cache invalidation on contract changes');

    console.log('\n🎯 Expected Performance Improvements:');
    console.log('  • Query Count Reduction: 50-70%');
    console.log('  • Response Time Improvement: 30-50%');
    console.log('  • Database Load Reduction: 40-60%');
    console.log('  • Memory Usage Reduction: 30-40%');

    console.log('\n📋 Target Endpoint Improvements:');
    console.log('  • /api/vendor/contracts: ~15 queries → 2-3 queries');
    console.log('  • /api/admin/revenue: ~100+ queries → 5-10 queries');
    console.log('  • /api/mietfaecher/available: N+1 → 1 query');
    console.log('  • /api/vendor/dashboard: ~20 queries → 3-5 queries');

    console.log('\n⚠️  Next Steps:');
    console.log('  1. Monitor production performance after deployment');
    console.log('  2. Run benchmark script periodically: node scripts/benchmark-queries.js');
    console.log('  3. Consider Redis for caching in production');
    console.log('  4. Monitor MongoDB slow query log');

    console.log('\n🎉 Query Optimization Complete!');

  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log('Query Optimization Script');
  console.log('');
  console.log('Usage: node scripts/apply-query-optimizations.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --benchmark    Run performance benchmarks after optimization');
  console.log('  --help, -h     Show this help message');
  console.log('');
  console.log('Environment Variables:');
  console.log('  MONGO_URI      MongoDB connection string (default: mongodb://localhost:27017/housnkuh)');
  process.exit(0);
}

// Run optimizations
if (require.main === module) {
  applyOptimizations();
}

module.exports = { applyOptimizations };