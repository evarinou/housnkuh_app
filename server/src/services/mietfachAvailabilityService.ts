/**
 * @file mietfachAvailabilityService.ts
 * @purpose Core business logic for calculating Mietfach availability based on existing bookings
 * @created 2025-08-06
 * @modified 2025-08-06
 */

import mongoose, { Types } from 'mongoose';
import { 
  DateRange, 
  BookingConflict, 
  AvailabilityResult, 
  AvailabilityOptions,
  BatchAvailabilityRequest,
  BatchAvailabilityResult,
  AvailabilityMetrics
} from '../types/availability';
import { 
  dateRangesOverlap, 
  findLatestEndDate,
  startOfNextMonth,
  createDateRangeFromDuration,
  startOfDay
} from '../utils/dateUtils';
import { IMietfach } from '../types/modelTypes';

/**
 * Service for calculating Mietfach availability with comprehensive conflict detection
 */
export class MietfachAvailabilityService {
  private readonly Mietfach = mongoose.model('Mietfach');
  private readonly Vertrag = mongoose.model('Vertrag');

  /**
   * Calculate availability for a single Mietfach
   * @param mietfach Mietfach document or ID
   * @param requestedRange Requested date range
   * @param options Calculation options
   * @returns Availability result with conflicts and next available date
   */
  async calculateAvailability(
    mietfach: IMietfach | string,
    requestedRange: DateRange,
    options: AvailabilityOptions = {}
  ): Promise<AvailabilityResult> {
    const startTime = Date.now();
    
    // Get Mietfach ID
    const mietfachId = typeof mietfach === 'string' ? mietfach : (mietfach._id as any).toString();
    
    // Default options
    const opts = {
      includeConflicts: true,
      calculateNextAvailable: true,
      maxSearchDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      ...options
    };

    try {
      // Find overlapping contracts
      const overlappingContracts = await this.findOverlappingContracts(
        mietfachId, 
        requestedRange
      );

      const isAvailable = overlappingContracts.length === 0;
      
      const result: AvailabilityResult = {
        available: isAvailable,
        conflicts: [],
        nextAvailable: null
      };

      // Include conflict details if requested
      if (opts.includeConflicts && overlappingContracts.length > 0) {
        result.conflicts = await this.extractConflictDetails(overlappingContracts);
      }

      // Calculate next available date if not available and requested
      if (!isAvailable && opts.calculateNextAvailable) {
        result.nextAvailable = await this.calculateNextAvailableDate(
          mietfachId,
          requestedRange.end,
          opts.maxSearchDate!
        );
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to calculate availability for Mietfach ${mietfachId}: ${error}`);
    }
  }

  /**
   * Check availability for multiple Mietfächer in batch
   * @param request Batch availability request
   * @returns Results for all requested Mietfächer
   */
  async calculateBatchAvailability(
    request: BatchAvailabilityRequest
  ): Promise<BatchAvailabilityResult> {
    const { mietfachIds, requestedRange, options } = request;
    const results: BatchAvailabilityResult = {};
    
    // Process all Mietfächer in parallel for better performance
    const availabilityPromises = mietfachIds.map(async (mietfachId) => {
      try {
        const result = await this.calculateAvailability(mietfachId, requestedRange, options);
        return { mietfachId, result };
      } catch (error) {
        // Return error as part of result
        return {
          mietfachId,
          result: {
            available: false,
            conflicts: [],
            nextAvailable: null,
            error: `Calculation failed: ${error}`
          }
        };
      }
    });

    const completedResults = await Promise.all(availabilityPromises);
    
    // Build result object
    completedResults.forEach(({ mietfachId, result }) => {
      results[mietfachId] = result;
    });

    return results;
  }

  /**
   * Find available Mietfächer of specific types for a date range
   * @param requestedTypes Array of Mietfach types to search
   * @param requestedRange Date range
   * @param limit Maximum number of results
   * @returns Array of available Mietfächer with availability info
   */
  async findAvailableMietfaecher(
    requestedTypes: string[],
    requestedRange: DateRange,
    limit: number = 50
  ): Promise<Array<IMietfach & { availability: AvailabilityResult }>> {
    // Build type filter
    const typeFilter = requestedTypes.includes('all') 
      ? {} 
      : { typ: { $in: requestedTypes } };

    // Find all Mietfächer matching criteria
    const mietfaecher = await this.Mietfach.find({
      verfuegbar: true,
      ...typeFilter
    }).limit(limit).lean();

    // Check availability for each
    const availabilityPromises = mietfaecher.map(async (mietfach: any) => {
      const availability = await this.calculateAvailability(
        mietfach._id.toString(),
        requestedRange,
        { includeConflicts: false, calculateNextAvailable: false }
      );
      
      return {
        ...mietfach,
        availability
      };
    });

    const results = await Promise.all(availabilityPromises);
    
    // Filter to only available ones
    return results.filter(result => result.availability.available);
  }

  /**
   * Get performance metrics for availability calculation operations
   */
  getMetrics(): AvailabilityMetrics {
    // This would typically be implemented with actual metrics collection
    // For now, return placeholder
    return {
      totalQueryTime: 0,
      queriesExecuted: 0,
      mietfaecherChecked: 0,
      conflictsFound: 0
    };
  }

  /**
   * Find contracts that overlap with the requested date range
   * @private
   */
  private async findOverlappingContracts(
    mietfachId: string,
    requestedRange: DateRange
  ): Promise<any[]> {
    return await this.Vertrag.find({
      'services.mietfach': new Types.ObjectId(mietfachId),
      status: { $in: ['active', 'scheduled', 'pending'] },
      'availabilityImpact.from': { $lt: requestedRange.end },
      'availabilityImpact.to': { $gt: requestedRange.start }
    }).populate('user', 'kontakt.name');
  }

  /**
   * Extract detailed conflict information from overlapping contracts
   * @private
   */
  private async extractConflictDetails(contracts: any[]): Promise<BookingConflict[]> {
    return contracts.map(contract => ({
      bookingId: contract._id.toString(),
      startDate: contract.availabilityImpact?.from || contract.startDate,
      endDate: contract.availabilityImpact?.to || contract.endDate,
      vendorName: contract.user?.kontakt?.name || 'Unbekannt',
      contractStatus: contract.status
    }));
  }

  /**
   * Calculate the next available date after conflicts end
   * @private
   */
  private async calculateNextAvailableDate(
    mietfachId: string,
    searchStartDate: Date,
    maxSearchDate: Date
  ): Promise<Date | null> {
    // Find all future conflicts for this Mietfach
    const futureConflicts = await this.Vertrag.find({
      'services.mietfach': new Types.ObjectId(mietfachId),
      status: { $in: ['active', 'scheduled', 'pending'] },
      'availabilityImpact.to': { $gt: searchStartDate }
    }).sort({ 'availabilityImpact.to': 1 });

    if (futureConflicts.length === 0) {
      // No future conflicts, available immediately
      return startOfDay(searchStartDate);
    }

    // Find the latest end date among all conflicts
    const conflictRanges = futureConflicts.map(contract => ({
      start: contract.availabilityImpact?.from || contract.startDate,
      end: contract.availabilityImpact?.to || contract.endDate
    }));

    const latestEndDate = findLatestEndDate(conflictRanges);
    
    if (!latestEndDate || latestEndDate > maxSearchDate) {
      return null; // No availability within search range
    }

    // Return the first day of the month after the latest conflict ends
    return startOfNextMonth(latestEndDate);
  }
}

/**
 * Singleton instance of the availability service
 */
export const mietfachAvailabilityService = new MietfachAvailabilityService();