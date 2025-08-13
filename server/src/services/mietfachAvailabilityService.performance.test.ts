/**
 * @file mietfachAvailabilityService.performance.test.ts
 * @purpose Performance tests for Mietfach availability service with large datasets
 * @created 2025-08-06
 * @modified 2025-08-06
 */

import { MietfachAvailabilityService } from './mietfachAvailabilityService';
import { DateRange } from '../types/availability';
import mongoose from 'mongoose';

// Mock mongoose models
jest.mock('mongoose');

describe('MietfachAvailabilityService - Performance Tests', () => {
  let service: MietfachAvailabilityService;
  let mockMietfach: any;
  let mockVertrag: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setTimeout(30000); // 30 seconds timeout for performance tests
    
    mockMietfach = {
      find: jest.fn(),
    };
    
    mockVertrag = {
      find: jest.fn(),
    };
    
    (mongoose.model as jest.Mock).mockImplementation((name: string) => {
      if (name === 'Mietfach') return mockMietfach;
      if (name === 'Vertrag') return mockVertrag;
      throw new Error(`Unknown model: ${name}`);
    });

    service = new MietfachAvailabilityService();
  });

  describe('Large dataset performance', () => {
    it('should handle 1000 overlapping contracts efficiently', async () => {
      const mietfachId = '507f1f77bcf86cd799439011';
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-02-01')
      };

      // Generate 1000 mock contracts
      const largeContractSet = Array.from({ length: 1000 }, (_, i) => ({
        _id: `contract${i}`,
        status: 'active',
        availabilityImpact: {
          from: new Date(2025, 0, 1 + (i % 30)), // Spread across January
          to: new Date(2025, 0, 15 + (i % 30))
        },
        user: { kontakt: { name: `Vendor ${i}` } }
      }));

      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(largeContractSet)
      });

      // Mock for next available calculation
      mockVertrag.find.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue(largeContractSet)
      }).mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue(largeContractSet.slice(0, 100)) // Top 100 future conflicts
      });

      const startTime = process.hrtime.bigint();
      const result = await service.calculateAvailability(mietfachId, requestedRange);
      const endTime = process.hrtime.bigint();
      
      const durationMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      expect(result.available).toBe(false);
      expect(result.conflicts).toHaveLength(1000);
      expect(durationMs).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`Performance: Processed 1000 contracts in ${durationMs.toFixed(2)}ms`);
    });

    it('should handle batch availability for 100 Mietfächer efficiently', async () => {
      const mietfachIds = Array.from({ length: 100 }, (_, i) => `mietfach${i}`);
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-02-01')
      };

      // Mock varying number of conflicts per Mietfach
      let callCount = 0;
      mockVertrag.find.mockImplementation(() => {
        const conflicts = Array.from({ length: callCount % 10 }, (_, i) => ({
          _id: `conflict${callCount}-${i}`,
          status: 'active',
          availabilityImpact: {
            from: new Date('2025-01-10'),
            to: new Date('2025-01-20')
          },
          user: { kontakt: { name: `Vendor ${i}` } }
        }));
        callCount++;
        return { populate: jest.fn().mockResolvedValue(conflicts) };
      });

      const startTime = process.hrtime.bigint();
      const result = await service.calculateBatchAvailability({
        mietfachIds,
        requestedRange,
        options: { includeConflicts: false, calculateNextAvailable: false }
      });
      const endTime = process.hrtime.bigint();
      
      const durationMs = Number(endTime - startTime) / 1000000;

      expect(Object.keys(result)).toHaveLength(100);
      expect(durationMs).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`Batch Performance: Processed 100 Mietfächer in ${durationMs.toFixed(2)}ms`);
    });

    it('should maintain performance with complex date range calculations', async () => {
      const mietfachIds = Array.from({ length: 50 }, (_, i) => `mietfach${i}`);
      
      // Large date range spanning multiple years
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2030-01-01') // 5 years
      };

      // Mock contracts with various overlapping patterns
      mockVertrag.find.mockImplementation(() => {
        const conflicts = Array.from({ length: 20 }, (_, i) => ({
          _id: `longterm${i}`,
          status: 'active',
          availabilityImpact: {
            from: new Date(2025 + (i % 3), (i % 12), 1),
            to: new Date(2025 + (i % 3), (i % 12) + 3, 1)
          },
          user: { kontakt: { name: `Long-term Vendor ${i}` } }
        }));
        return { populate: jest.fn().mockResolvedValue(conflicts) };
      });

      const startTime = process.hrtime.bigint();
      const result = await service.calculateBatchAvailability({
        mietfachIds,
        requestedRange,
        options: { includeConflicts: true, calculateNextAvailable: true }
      });
      const endTime = process.hrtime.bigint();
      
      const durationMs = Number(endTime - startTime) / 1000000;

      expect(Object.keys(result)).toHaveLength(50);
      expect(durationMs).toBeLessThan(15000); // Should complete within 15 seconds
      
      console.log(`Long-range Performance: Processed 50 Mietfächer over 5 years in ${durationMs.toFixed(2)}ms`);
    });

    it('should handle memory efficiently with large conflict datasets', async () => {
      const mietfachId = '507f1f77bcf86cd799439011';
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-02-01')
      };

      // Generate 10,000 mock contracts to test memory usage
      const massiveContractSet = Array.from({ length: 10000 }, (_, i) => ({
        _id: `contract${i}`,
        status: ['active', 'scheduled', 'pending'][i % 3],
        availabilityImpact: {
          from: new Date(2025, 0, 1 + (i % 365)), // Spread across year
          to: new Date(2025, 0, 30 + (i % 365))
        },
        user: { 
          kontakt: { 
            name: `Vendor ${i}`,
            email: `vendor${i}@test.com`
          } 
        }
      }));

      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(massiveContractSet)
      });

      // Monitor memory usage
      const memBefore = process.memoryUsage();
      const startTime = process.hrtime.bigint();
      
      const result = await service.calculateAvailability(
        mietfachId, 
        requestedRange,
        { includeConflicts: true, calculateNextAvailable: false }
      );
      
      const endTime = process.hrtime.bigint();
      const memAfter = process.memoryUsage();
      
      const durationMs = Number(endTime - startTime) / 1000000;
      const memDeltaMB = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      expect(result.conflicts).toHaveLength(10000);
      expect(durationMs).toBeLessThan(30000); // Should complete within 30 seconds
      expect(memDeltaMB).toBeLessThan(500); // Should not use more than 500MB additional memory
      
      console.log(`Memory Performance: Processed 10,000 contracts in ${durationMs.toFixed(2)}ms using ${memDeltaMB.toFixed(2)}MB additional memory`);
    });
  });

  describe('Optimization effectiveness', () => {
    it('should benefit from options that skip expensive operations', async () => {
      const mietfachIds = Array.from({ length: 20 }, (_, i) => `mietfach${i}`);
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-02-01')
      };

      // Generate conflicts for all Mietfächer
      mockVertrag.find.mockImplementation(() => {
        const conflicts = Array.from({ length: 100 }, (_, i) => ({
          _id: `conflict${i}`,
          status: 'active',
          availabilityImpact: {
            from: new Date('2025-01-15'),
            to: new Date('2025-01-31')
          },
          user: { kontakt: { name: `Vendor ${i}` } }
        }));
        return { populate: jest.fn().mockResolvedValue(conflicts) };
      });

      // Test with full options
      const startTimeFull = process.hrtime.bigint();
      const resultFull = await service.calculateBatchAvailability({
        mietfachIds,
        requestedRange,
        options: { includeConflicts: true, calculateNextAvailable: true }
      });
      const endTimeFull = process.hrtime.bigint();
      const durationFullMs = Number(endTimeFull - startTimeFull) / 1000000;

      // Reset mock call count
      jest.clearAllMocks();
      mockVertrag.find.mockImplementation(() => {
        const conflicts = Array.from({ length: 100 }, (_, i) => ({
          _id: `conflict${i}`,
          status: 'active',
          availabilityImpact: {
            from: new Date('2025-01-15'),
            to: new Date('2025-01-31')
          },
          user: { kontakt: { name: `Vendor ${i}` } }
        }));
        return { populate: jest.fn().mockResolvedValue(conflicts) };
      });

      // Test with minimal options
      const startTimeMinimal = process.hrtime.bigint();
      const resultMinimal = await service.calculateBatchAvailability({
        mietfachIds,
        requestedRange,
        options: { includeConflicts: false, calculateNextAvailable: false }
      });
      const endTimeMinimal = process.hrtime.bigint();
      const durationMinimalMs = Number(endTimeMinimal - startTimeMinimal) / 1000000;

      // Minimal options should be significantly faster
      expect(durationMinimalMs).toBeLessThan(durationFullMs);
      expect(durationMinimalMs).toBeLessThan(durationFullMs * 0.7); // At least 30% faster
      
      console.log(`Optimization: Full options ${durationFullMs.toFixed(2)}ms vs Minimal options ${durationMinimalMs.toFixed(2)}ms`);
      console.log(`Performance gain: ${((durationFullMs - durationMinimalMs) / durationFullMs * 100).toFixed(1)}%`);
    });

    it('should scale linearly with number of Mietfächer', async () => {
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-02-01')
      };

      // Mock minimal conflicts for consistent testing
      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const sizes = [10, 50, 100];
      const durations: number[] = [];

      for (const size of sizes) {
        const mietfachIds = Array.from({ length: size }, (_, i) => `mietfach${i}`);
        
        const startTime = process.hrtime.bigint();
        await service.calculateBatchAvailability({
          mietfachIds,
          requestedRange,
          options: { includeConflicts: false, calculateNextAvailable: false }
        });
        const endTime = process.hrtime.bigint();
        
        const duration = Number(endTime - startTime) / 1000000;
        durations.push(duration);
        
        console.log(`Scaling: ${size} Mietfächer processed in ${duration.toFixed(2)}ms`);
      }

      // Check that scaling is reasonable (not exponential)
      const ratio1 = durations[1] / durations[0]; // 50 vs 10
      const ratio2 = durations[2] / durations[1]; // 100 vs 50
      
      expect(ratio1).toBeLessThan(10); // Should not be 10x slower for 5x more items
      expect(ratio2).toBeLessThan(5); // Should not be 5x slower for 2x more items
      
      console.log(`Scaling ratios: 50/10 = ${ratio1.toFixed(2)}x, 100/50 = ${ratio2.toFixed(2)}x`);
    });
  });
});