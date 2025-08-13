/**
 * @file dateUtils.test.ts
 * @purpose Unit tests for date utility functions used in availability calculations
 * @created 2025-08-06
 * @modified 2025-08-06
 */

import {
  dateRangesOverlap,
  calculateEndDateFromDuration,
  isDateInRange,
  findLatestEndDate,
  createDateRangeFromDuration,
  startOfDay,
  endOfDay,
  startOfNextMonth,
  isSameDay,
  monthsBetween
} from './dateUtils';
import { DateRange } from '../types/availability';

describe('dateUtils', () => {
  describe('dateRangesOverlap', () => {
    it('should detect overlapping ranges', () => {
      const range1: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-15')
      };
      const range2: DateRange = {
        start: new Date('2025-01-10'),
        end: new Date('2025-01-20')
      };

      expect(dateRangesOverlap(range1, range2)).toBe(true);
      expect(dateRangesOverlap(range2, range1)).toBe(true);
    });

    it('should detect non-overlapping ranges', () => {
      const range1: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-15')
      };
      const range2: DateRange = {
        start: new Date('2025-01-16'),
        end: new Date('2025-01-30')
      };

      expect(dateRangesOverlap(range1, range2)).toBe(false);
    });

    it('should handle adjacent ranges (no overlap)', () => {
      const range1: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-15')
      };
      const range2: DateRange = {
        start: new Date('2025-01-15'), // Starts exactly when range1 ends
        end: new Date('2025-01-30')
      };

      expect(dateRangesOverlap(range1, range2)).toBe(false);
    });

    it('should handle one range completely contained in another', () => {
      const range1: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      };
      const range2: DateRange = {
        start: new Date('2025-01-10'),
        end: new Date('2025-01-20')
      };

      expect(dateRangesOverlap(range1, range2)).toBe(true);
    });
  });

  describe('calculateEndDateFromDuration', () => {
    it('should add months correctly', () => {
      const startDate = new Date('2025-01-01');
      const result = calculateEndDateFromDuration(startDate, 3);
      
      expect(result.getMonth()).toBe(3); // April (0-indexed)
      expect(result.getFullYear()).toBe(2025);
      expect(result.getDate()).toBe(1);
    });

    it('should handle year rollover', () => {
      const startDate = new Date('2025-10-01');
      const result = calculateEndDateFromDuration(startDate, 6);
      
      expect(result.getMonth()).toBe(3); // April (0-indexed)
      expect(result.getFullYear()).toBe(2026);
    });

    it('should handle leap years correctly', () => {
      const startDate = new Date('2024-01-29'); // 2024 is a leap year
      const result = calculateEndDateFromDuration(startDate, 1);
      
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(29);
    });

    it('should handle month-end edge cases', () => {
      const startDate = new Date('2025-01-31');
      const result = calculateEndDateFromDuration(startDate, 1);
      
      // When adding months to Jan 31, JavaScript moves to Feb 28 (or 29 in leap years)
      // Then the month becomes March (2), not February (1)
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getDate()).toBeLessThanOrEqual(3); // Should be around March 2-3
    });
  });

  describe('isDateInRange', () => {
    const range: DateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31')
    };

    it('should return true for date within range', () => {
      const date = new Date('2025-01-15');
      expect(isDateInRange(date, range)).toBe(true);
    });

    it('should return true for date at start of range (inclusive)', () => {
      const date = new Date('2025-01-01');
      expect(isDateInRange(date, range)).toBe(true);
    });

    it('should return false for date at end of range (exclusive)', () => {
      const date = new Date('2025-01-31');
      expect(isDateInRange(date, range)).toBe(false);
    });

    it('should return false for date outside range', () => {
      const dateBefore = new Date('2024-12-31');
      const dateAfter = new Date('2025-02-01');
      
      expect(isDateInRange(dateBefore, range)).toBe(false);
      expect(isDateInRange(dateAfter, range)).toBe(false);
    });
  });

  describe('findLatestEndDate', () => {
    it('should find the latest end date from multiple ranges', () => {
      const ranges: DateRange[] = [
        {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-15')
        },
        {
          start: new Date('2025-01-10'),
          end: new Date('2025-01-25') // Latest
        },
        {
          start: new Date('2025-01-05'),
          end: new Date('2025-01-20')
        }
      ];

      const latest = findLatestEndDate(ranges);
      expect(latest).toEqual(new Date('2025-01-25'));
    });

    it('should return null for empty array', () => {
      const latest = findLatestEndDate([]);
      expect(latest).toBeNull();
    });

    it('should handle single range', () => {
      const ranges: DateRange[] = [
        {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-15')
        }
      ];

      const latest = findLatestEndDate(ranges);
      expect(latest).toEqual(new Date('2025-01-15'));
    });
  });

  describe('createDateRangeFromDuration', () => {
    it('should create correct date range', () => {
      const startDate = new Date('2025-01-01');
      const range = createDateRangeFromDuration(startDate, 2);

      expect(range.start).toEqual(startDate);
      expect(range.end.getMonth()).toBe(2); // March (0-indexed)
      expect(range.end.getFullYear()).toBe(2025);
    });
  });

  describe('startOfDay', () => {
    it('should normalize time to start of day', () => {
      const date = new Date('2025-01-15T14:30:45.123Z');
      const normalized = startOfDay(date);

      expect(normalized.getHours()).toBe(0);
      expect(normalized.getMinutes()).toBe(0);
      expect(normalized.getSeconds()).toBe(0);
      expect(normalized.getMilliseconds()).toBe(0);
      expect(normalized.getDate()).toBe(15);
      expect(normalized.getMonth()).toBe(0);
    });
  });

  describe('endOfDay', () => {
    it('should normalize time to end of day', () => {
      const date = new Date('2025-01-15T14:30:45.123Z');
      const normalized = endOfDay(date);

      expect(normalized.getHours()).toBe(23);
      expect(normalized.getMinutes()).toBe(59);
      expect(normalized.getSeconds()).toBe(59);
      expect(normalized.getMilliseconds()).toBe(999);
      expect(normalized.getDate()).toBe(15);
    });
  });

  describe('startOfNextMonth', () => {
    it('should return first day of next month', () => {
      const date = new Date('2025-01-15');
      const nextMonth = startOfNextMonth(date);

      expect(nextMonth.getDate()).toBe(1);
      expect(nextMonth.getMonth()).toBe(1); // February (0-indexed)
      expect(nextMonth.getFullYear()).toBe(2025);
      expect(nextMonth.getHours()).toBe(0);
    });

    it('should handle year rollover', () => {
      const date = new Date('2025-12-15');
      const nextMonth = startOfNextMonth(date);

      expect(nextMonth.getDate()).toBe(1);
      expect(nextMonth.getMonth()).toBe(0); // January (0-indexed)
      expect(nextMonth.getFullYear()).toBe(2026);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same calendar day with different times', () => {
      const date1 = new Date('2025-01-15T08:00:00Z');
      const date2 = new Date('2025-01-15T20:30:00Z');

      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      // Create dates in local time to avoid timezone issues
      const date1 = new Date('2025-01-15T23:59:59');
      const date2 = new Date('2025-01-16T00:00:00');

      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should handle timezone differences', () => {
      const date1 = new Date('2025-01-15T08:00:00+00:00');
      const date2 = new Date('2025-01-15T10:00:00+02:00'); // Same UTC time

      expect(isSameDay(date1, date2)).toBe(true);
    });
  });

  describe('monthsBetween', () => {
    it('should calculate exact months', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-04-01');

      expect(monthsBetween(start, end)).toBe(3);
    });

    it('should calculate fractional months', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-15');

      const result = monthsBetween(start, end);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
      expect(result).toBeCloseTo(0.45, 1); // Approximately half a month
    });

    it('should handle year boundaries', () => {
      const start = new Date('2024-11-01');
      const end = new Date('2025-02-01');

      expect(monthsBetween(start, end)).toBe(3);
    });

    it('should handle leap years', () => {
      const start = new Date('2024-01-29'); // Leap year
      const end = new Date('2024-02-29');

      expect(monthsBetween(start, end)).toBe(1);
    });

    it('should return 0 for same date', () => {
      const date = new Date('2025-01-15');
      expect(monthsBetween(date, date)).toBe(0);
    });

    it('should handle negative duration (end before start)', () => {
      const start = new Date('2025-02-01');
      const end = new Date('2025-01-01');

      expect(monthsBetween(start, end)).toBe(-1);
    });
  });
});