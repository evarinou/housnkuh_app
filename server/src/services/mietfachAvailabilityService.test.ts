/**
 * @file mietfachAvailabilityService.test.ts
 * @purpose Comprehensive unit tests for Mietfach availability calculation service
 * @created 2025-08-06
 * @modified 2025-08-06
 */

import { MietfachAvailabilityService } from './mietfachAvailabilityService';
import { DateRange, AvailabilityOptions } from '../types/availability';
import { createDateRangeFromDuration, startOfDay } from '../utils/dateUtils';
import mongoose from 'mongoose';

// Mock mongoose models
jest.mock('mongoose');

describe('MietfachAvailabilityService', () => {
  let service: MietfachAvailabilityService;
  let mockMietfach: any;
  let mockVertrag: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock models
    mockMietfach = {
      find: jest.fn(),
    };
    
    mockVertrag = {
      find: jest.fn(),
    };
    
    // Mock mongoose.model calls
    (mongoose.model as jest.Mock).mockImplementation((name: string) => {
      if (name === 'Mietfach') return mockMietfach;
      if (name === 'Vertrag') return mockVertrag;
      throw new Error(`Unknown model: ${name}`);
    });

    service = new MietfachAvailabilityService();
  });

  describe('calculateAvailability', () => {
    const mietfachId = '507f1f77bcf86cd799439011';
    const baseDate = new Date('2025-01-01');
    const requestedRange: DateRange = {
      start: baseDate,
      end: new Date('2025-02-01')
    };

    it('should return available=true when no overlapping contracts exist', async () => {
      // Mock no overlapping contracts
      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const result = await service.calculateAvailability(mietfachId, requestedRange);

      expect(result.available).toBe(true);
      expect(result.conflicts).toEqual([]);
      expect(result.nextAvailable).toBeNull();
    });

    it('should return available=false when overlapping contracts exist', async () => {
      // Mock overlapping contract
      const mockContract = {
        _id: 'contract123',
        status: 'active',
        availabilityImpact: {
          from: new Date('2025-01-15'),
          to: new Date('2025-01-31')
        },
        user: {
          kontakt: { name: 'Test Vendor' }
        }
      };

      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockContract])
      });

      // Mock future conflicts for next available calculation
      mockVertrag.find.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue([mockContract])
      }).mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue([mockContract])
      });

      const result = await service.calculateAvailability(mietfachId, requestedRange);

      expect(result.available).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        bookingId: 'contract123',
        vendorName: 'Test Vendor',
        contractStatus: 'active'
      });
      expect(result.nextAvailable).toBeInstanceOf(Date);
    });

    it('should handle edge case: same-day start/end dates', async () => {
      const sameDayRange: DateRange = {
        start: baseDate,
        end: baseDate
      };

      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const result = await service.calculateAvailability(mietfachId, sameDayRange);

      expect(result.available).toBe(true);
    });

    it('should handle partial month overlaps correctly', async () => {
      const partialOverlapContract = {
        _id: 'contract123',
        status: 'scheduled',
        availabilityImpact: {
          from: new Date('2024-12-15'), // Starts before requested range
          to: new Date('2025-01-15')    // Ends within requested range
        },
        user: { kontakt: { name: 'Partial Overlap Vendor' } }
      };

      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([partialOverlapContract])
      });

      mockVertrag.find.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue([partialOverlapContract])
      }).mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue([partialOverlapContract])
      });

      const result = await service.calculateAvailability(mietfachId, requestedRange);

      expect(result.available).toBe(false);
      expect(result.conflicts[0].vendorName).toBe('Partial Overlap Vendor');
    });

    it('should exclude cancelled bookings from conflicts', async () => {
      const cancelledContract = {
        _id: 'cancelled123',
        status: 'cancelled', // Should not be included in active statuses
        availabilityImpact: {
          from: new Date('2025-01-15'),
          to: new Date('2025-01-31')
        }
      };

      // Mock find calls - cancelled contracts should not be returned
      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]) // No active contracts returned
      });

      const result = await service.calculateAvailability(mietfachId, requestedRange);

      expect(result.available).toBe(true);
      expect(result.conflicts).toEqual([]);

      // Verify the query filters include only active statuses
      expect(mockVertrag.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: ['active', 'scheduled', 'pending'] }
        })
      );
    });

    it('should respect options.includeConflicts = false', async () => {
      const mockContract = {
        _id: 'contract123',
        status: 'active',
        availabilityImpact: {
          from: new Date('2025-01-15'),
          to: new Date('2025-01-31')
        },
        user: { kontakt: { name: 'Test Vendor' } }
      };

      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockContract])
      });

      const options: AvailabilityOptions = {
        includeConflicts: false,
        calculateNextAvailable: false
      };

      const result = await service.calculateAvailability(mietfachId, requestedRange, options);

      expect(result.available).toBe(false);
      expect(result.conflicts).toEqual([]); // Should be empty due to option
      expect(result.nextAvailable).toBeNull(); // Should be null due to option
    });

    it('should handle booking extensions correctly', async () => {
      // Test with a contract that gets extended
      const extendedContract = {
        _id: 'extended123',
        status: 'active',
        availabilityImpact: {
          from: new Date('2024-12-01'),
          to: new Date('2025-03-01') // Extended beyond normal duration
        },
        user: { kontakt: { name: 'Extended Booking Vendor' } }
      };

      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([extendedContract])
      });

      mockVertrag.find.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue([extendedContract])
      }).mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue([extendedContract])
      });

      const result = await service.calculateAvailability(mietfachId, requestedRange);

      expect(result.available).toBe(false);
      expect(result.conflicts[0].endDate).toEqual(new Date('2025-03-01'));
    });
  });

  describe('calculateBatchAvailability', () => {
    it('should process multiple Mietfächer in parallel', async () => {
      const mietfachIds = ['id1', 'id2', 'id3'];
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-02-01')
      };

      // Mock no conflicts for all
      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const result = await service.calculateBatchAvailability({
        mietfachIds,
        requestedRange
      });

      expect(Object.keys(result)).toHaveLength(3);
      expect(result['id1'].available).toBe(true);
      expect(result['id2'].available).toBe(true);
      expect(result['id3'].available).toBe(true);
    });

    it('should handle individual calculation errors gracefully', async () => {
      const mietfachIds = ['valid-id', 'error-id'];
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-02-01')
      };

      // Mock success for first ID, error for second
      let callCount = 0;
      mockVertrag.find.mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return { populate: jest.fn().mockResolvedValue([]) }; // Success
        } else {
          throw new Error('Database connection failed'); // Error
        }
      });

      const result = await service.calculateBatchAvailability({
        mietfachIds,
        requestedRange
      });

      expect(result['valid-id'].available).toBe(true);
      expect(result['error-id'].available).toBe(false);
      expect(result['error-id']).toHaveProperty('error');
    });
  });

  describe('findAvailableMietfaecher', () => {
    it('should find available Mietfächer of specified types', async () => {
      const requestedTypes = ['kuehl', 'regal'];
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-02-01')
      };

      // Mock available Mietfächer
      const mockMietfaecher = [
        { _id: 'mf1', typ: 'kuehl', bezeichnung: 'Kühlregal 1' },
        { _id: 'mf2', typ: 'regal', bezeichnung: 'Regal A' }
      ];

      mockMietfach.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockMietfaecher)
        })
      });

      // Mock no conflicts
      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const result = await service.findAvailableMietfaecher(
        requestedTypes,
        requestedRange,
        10
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('availability');
      expect(result[0].availability.available).toBe(true);
    });

    it('should filter out unavailable Mietfächer', async () => {
      const requestedTypes = ['kuehl'];
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-02-01')
      };

      const mockMietfaecher = [
        { _id: 'available', typ: 'kuehl' },
        { _id: 'unavailable', typ: 'kuehl' }
      ];

      mockMietfach.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockMietfaecher)
        })
      });

      // Mock conflicts for second Mietfach only
      let callCount = 0;
      mockVertrag.find.mockImplementation(() => {
        const conflicts = callCount === 1 ? [{ _id: 'conflict' }] : [];
        callCount++;
        return { populate: jest.fn().mockResolvedValue(conflicts) };
      });

      const result = await service.findAvailableMietfaecher(
        requestedTypes,
        requestedRange
      );

      expect(result).toHaveLength(1); // Only available one returned
      expect(result[0]._id).toBe('available');
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle very large date ranges efficiently', async () => {
      const mietfachId = '507f1f77bcf86cd799439011';
      const largeRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2030-01-01') // 5 years
      };

      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const startTime = Date.now();
      const result = await service.calculateAvailability(mietfachId, largeRange);
      const duration = Date.now() - startTime;

      expect(result.available).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple overlapping bookings correctly', async () => {
      const mietfachId = '507f1f77bcf86cd799439011';
      const requestedRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-04-01')
      };

      // Multiple overlapping contracts
      const overlappingContracts = [
        {
          _id: 'contract1',
          status: 'active',
          availabilityImpact: {
            from: new Date('2025-01-15'),
            to: new Date('2025-02-15')
          },
          user: { kontakt: { name: 'Vendor 1' } }
        },
        {
          _id: 'contract2', 
          status: 'scheduled',
          availabilityImpact: {
            from: new Date('2025-02-01'), // Overlaps with contract1
            to: new Date('2025-03-01')
          },
          user: { kontakt: { name: 'Vendor 2' } }
        }
      ];

      mockVertrag.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(overlappingContracts)
      });

      // Mock for next available calculation
      mockVertrag.find.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue(overlappingContracts)
      }).mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue(overlappingContracts)
      });

      const result = await service.calculateAvailability(mietfachId, requestedRange);

      expect(result.available).toBe(false);
      expect(result.conflicts).toHaveLength(2);
      expect(result.nextAvailable).toBeInstanceOf(Date);
      // Next available should be after the latest conflict ends
      expect(result.nextAvailable!.getTime()).toBeGreaterThan(
        new Date('2025-03-01').getTime()
      );
    });
  });
});