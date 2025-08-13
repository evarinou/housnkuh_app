/**
 * @file availability.ts
 * @purpose TypeScript interfaces for Mietfach availability calculation system
 * @created 2025-08-06
 * @modified 2025-08-06
 */

import { Types } from 'mongoose';

/**
 * Represents a date range for availability checking
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Information about a booking conflict with an existing contract
 */
export interface BookingConflict {
  bookingId: string;
  startDate: Date;
  endDate: Date;
  vendorName?: string;
  contractStatus: 'active' | 'scheduled' | 'pending';
}

/**
 * Result of availability calculation for a single Mietfach
 */
export interface AvailabilityResult {
  available: boolean;
  conflicts: BookingConflict[];
  nextAvailable: Date | null;
}

/**
 * Options for availability calculation
 */
export interface AvailabilityOptions {
  /** Whether to include detailed conflict information */
  includeConflicts?: boolean;
  /** Whether to calculate next available date */
  calculateNextAvailable?: boolean;
  /** Maximum date to search for next available slot */
  maxSearchDate?: Date;
}

/**
 * Input for batch availability checking
 */
export interface BatchAvailabilityRequest {
  mietfachIds: string[];
  requestedRange: DateRange;
  options?: AvailabilityOptions;
}

/**
 * Result for batch availability checking
 */
export interface BatchAvailabilityResult {
  [mietfachId: string]: AvailabilityResult;
}

/**
 * Performance metrics for availability calculations
 */
export interface AvailabilityMetrics {
  totalQueryTime: number;
  queriesExecuted: number;
  mietfaecherChecked: number;
  conflictsFound: number;
}