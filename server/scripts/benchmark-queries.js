/**
 * Query Performance Benchmark Script
 * Measures query performance before and after optimizations
 * Run with: node scripts/benchmark-queries.js
 */

const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

// Import models
require('../src/models/User');
require('../src/models/Vertrag');
require('../src/models/Mietfach');
require('../src/models/MonthlyRevenue');

const User = mongoose.model('User');
const Vertrag = mongoose.model('Vertrag');
const Mietfach = mongoose.model('Mietfach');
const MonthlyRevenue = mongoose.model('MonthlyRevenue');

class QueryBenchmark {
  constructor() {
    this.results = [];
  }

  async measure(testName, queryFunction, iterations = 5) {
    console.log(`\n🔍 Testing: ${testName}`);
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await queryFunction();
      const end = performance.now();
      const duration = end - start;
      times.push(duration);
      
      if (i === 0) {
        console.log(`  First run: ${duration.toFixed(2)}ms`);
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log(`  Range: ${minTime.toFixed(2)}ms - ${maxTime.toFixed(2)}ms`);

    this.results.push({
      testName,
      avgTime,
      minTime,
      maxTime,
      iterations
    });

    return avgTime;
  }

  async benchmarkContractQueries() {
    console.log('\n📊 BENCHMARK: Contract Queries');

    // Test 1: Basic contract loading with populate
    await this.measure('Basic Contract Query with Populate', async () => {
      const contracts = await Vertrag.find({ status: 'active' })
        .populate('user', 'username kontakt.name kontakt.email')
        .populate('services.mietfach', 'bezeichnung typ beschreibung standort groesse preis')
        .limit(10);
      return contracts;
    });

    // Test 2: Aggregation-based contract loading
    await this.measure('Optimized Contract Aggregation', async () => {
      const contracts = await Vertrag.aggregate([
        { $match: { status: 'active' } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  username: 1,
                  'kontakt.name': 1,
                  'kontakt.email': 1
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'mietfaecher',
            localField: 'services.mietfach',
            foreignField: '_id',
            as: 'mietfachDetails'
          }
        },
        { $unwind: '$user' },
        {
          $addFields: {
            services: {
              $map: {
                input: '$services',
                as: 'service',
                in: {
                  $mergeObjects: [
                    '$$service',
                    {
                      mietfach: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$mietfachDetails',
                              cond: { $eq: ['$$this._id', '$$service.mietfach'] }
                            }
                          },
                          0
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $project: {
            mietfachDetails: 0
          }
        }
      ]);
      return contracts;
    });
  }

  async benchmarkMietfachQueries() {
    console.log('\n📊 BENCHMARK: Mietfach Queries');

    // Get some mietfach IDs for testing
    const sampleMietfaecher = await Mietfach.find({}).limit(5);
    if (sampleMietfaecher.length === 0) {
      console.log('  ⚠️  No Mietfächer found, skipping tests');
      return;
    }

    // Test 1: N+1 pattern (original)
    await this.measure('N+1 Mietfach with Contracts (OLD)', async () => {
      const mietfaecher = await Mietfach.find({}).limit(5);
      const results = [];
      
      for (const mietfach of mietfaecher) {
        const vertraege = await Vertrag.find({
          'services.mietfach': mietfach._id
        }).populate('user', 'username kontakt.name kontakt.email');
        
        results.push({
          ...mietfach.toObject(),
          vertraege: vertraege.length
        });
      }
      
      return results;
    });

    // Test 2: Optimized aggregation
    await this.measure('Optimized Mietfach Aggregation (NEW)', async () => {
      const results = await Mietfach.aggregate([
        { $limit: 5 },
        {
          $lookup: {
            from: 'vertraege',
            let: { mietfachId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$$mietfachId', '$services.mietfach']
                  }
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'user',
                  foreignField: '_id',
                  as: 'user',
                  pipeline: [
                    {
                      $project: {
                        username: 1,
                        'kontakt.name': 1,
                        'kontakt.email': 1
                      }
                    }
                  ]
                }
              },
              { $unwind: '$user' }
            ],
            as: 'vertraege'
          }
        },
        {
          $addFields: {
            vertraegeCount: { $size: '$vertraege' }
          }
        }
      ]);
      return results;
    });
  }

  async benchmarkRevenueQueries() {
    console.log('\n📊 BENCHMARK: Revenue Queries');

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Test 1: Revenue calculation with individual queries
    await this.measure('Revenue Calculation (Standard)', async () => {
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);

      const contracts = await Vertrag.find({
        status: { $in: ['active', 'scheduled'] },
        scheduledStartDate: { $lte: endDate },
        $or: [
          { 'availabilityImpact.to': { $gte: startDate } },
          { 'availabilityImpact.to': null }
        ]
      }).populate('services.mietfach');

      const paidContracts = contracts.filter(contract => 
        !contract.istProbemonatBuchung || 
        (contract.zahlungspflichtigAb && contract.zahlungspflichtigAb <= endDate)
      );

      const revenue = paidContracts.reduce((sum, contract) => {
        const monthlyPrice = contract.totalMonthlyPrice || 0;
        return sum + monthlyPrice;
      }, 0);

      return { revenue, contractCount: paidContracts.length };
    });

    // Test 2: Revenue calculation with aggregation
    await this.measure('Revenue Calculation (Aggregated)', async () => {
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);

      const result = await Vertrag.aggregate([
        {
          $match: {
            status: { $in: ['active', 'scheduled'] },
            scheduledStartDate: { $lte: endDate },
            $or: [
              { 'availabilityImpact.to': { $gte: startDate } },
              { 'availabilityImpact.to': null }
            ]
          }
        },
        {
          $match: {
            $or: [
              { istProbemonatBuchung: false },
              {
                $and: [
                  { istProbemonatBuchung: true },
                  { zahlungspflichtigAb: { $lte: endDate } }
                ]
              }
            ]
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalMonthlyPrice' },
            contractCount: { $sum: 1 }
          }
        }
      ]);

      return result[0] || { totalRevenue: 0, contractCount: 0 };
    });
  }

  async benchmarkIndexUsage() {
    console.log('\n📊 BENCHMARK: Index Usage');

    // Test queries that should benefit from indexes
    await this.measure('User Lookup by Email', async () => {
      const users = await User.find({ 
        email: { $regex: /@example\.com$/, $options: 'i' } 
      }).limit(10);
      return users;
    });

    await this.measure('Contracts by User and Status', async () => {
      const users = await User.find({ isVendor: true }).limit(3);
      if (users.length === 0) return [];
      
      const contracts = await Vertrag.find({
        user: { $in: users.map(u => u._id) },
        status: 'active'
      });
      return contracts;
    });

    await this.measure('Mietfach by Type and Availability', async () => {
      const mietfaecher = await Mietfach.find({
        typ: 'kuehl',
        verfuegbar: true
      });
      return mietfaecher;
    });
  }

  generateReport() {
    console.log('\n📈 PERFORMANCE REPORT');
    console.log('=' .repeat(50));

    this.results.forEach(result => {
      console.log(`\n${result.testName}:`);
      console.log(`  Average Time: ${result.avgTime.toFixed(2)}ms`);
      console.log(`  Best Time: ${result.minTime.toFixed(2)}ms`);
      console.log(`  Worst Time: ${result.maxTime.toFixed(2)}ms`);
      
      // Performance rating
      let rating = '🔴 Slow';
      if (result.avgTime < 50) rating = '🟢 Fast';
      else if (result.avgTime < 200) rating = '🟡 Moderate';
      
      console.log(`  Performance: ${rating}`);
    });

    // Summary
    const avgOverall = this.results.reduce((sum, r) => sum + r.avgTime, 0) / this.results.length;
    console.log(`\n🎯 Overall Average: ${avgOverall.toFixed(2)}ms`);
    
    const fastQueries = this.results.filter(r => r.avgTime < 50).length;
    const slowQueries = this.results.filter(r => r.avgTime > 200).length;
    
    console.log(`📊 Query Performance Distribution:`);
    console.log(`   Fast (< 50ms): ${fastQueries}/${this.results.length}`);
    console.log(`   Slow (> 200ms): ${slowQueries}/${this.results.length}`);
  }
}

async function runBenchmarks() {
  try {
    console.log('🚀 Starting Query Performance Benchmarks');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const benchmark = new QueryBenchmark();

    // Run all benchmarks
    await benchmark.benchmarkContractQueries();
    await benchmark.benchmarkMietfachQueries();
    await benchmark.benchmarkRevenueQueries();
    await benchmark.benchmarkIndexUsage();

    // Generate report
    benchmark.generateReport();

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run benchmarks if this script is called directly
if (require.main === module) {
  runBenchmarks();
}

module.exports = { QueryBenchmark, runBenchmarks };