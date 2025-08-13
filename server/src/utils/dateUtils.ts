/**
 * @file dateUtils.ts
 * @purpose Date utility functions for Mietfach availability calculations
 * @created 2025-08-06
 * @modified 2025-08-06
 */

import { DateRange } from '../types/availability';

/**
 * Check if two date ranges overlap
 * @param range1 First date range
 * @param range2 Second date range
 * @returns true if ranges overlap
 */
export function dateRangesOverlap(range1: DateRange, range2: DateRange): boolean {
  return range1.start < range2.end && range1.end > range2.start;
}

/**
 * Calculate end date from start date and duration in months
 * @param startDate The start date
 * @param months Number of months to add
 * @returns End date
 */
export function calculateEndDateFromDuration(startDate: Date, months: number): Date {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months);
  return endDate;
}

/**
 * Check if a date falls within a range (inclusive start, exclusive end)
 * @param date Date to check
 * @param range Date range
 * @returns true if date is within range
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date < range.end;
}

/**
 * Find the latest end date from a list of date ranges
 * @param ranges Array of date ranges
 * @returns Latest end date or null if array is empty
 */
export function findLatestEndDate(ranges: DateRange[]): Date | null {
  if (ranges.length === 0) {
    return null;
  }
  
  return ranges.reduce((latest, range) => 
    range.end > latest ? range.end : latest, 
    ranges[0].end
  );
}

/**
 * Create a date range from start date and duration in months
 * @param startDate Start date
 * @param durationMonths Duration in months
 * @returns Date range
 */
export function createDateRangeFromDuration(
  startDate: Date, 
  durationMonths: number
): DateRange {
  return {
    start: startDate,
    end: calculateEndDateFromDuration(startDate, durationMonths)
  };
}

/**
 * Normalize date to start of day (remove time component)
 * @param date Input date
 * @returns Date at start of day
 */
export function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Normalize date to end of day
 * @param date Input date
 * @returns Date at end of day
 */
export function endOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

/**
 * Get the first day of the next month after given date
 * @param date Input date
 * @returns First day of next month
 */
export function startOfNextMonth(date: Date): Date {
  const nextMonth = new Date(date);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth;
}

/**
 * Check if two dates represent the same day (ignoring time)
 * @param date1 First date
 * @param date2 Second date
 * @returns true if same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return startOfDay(date1).getTime() === startOfDay(date2).getTime();
}

/**
 * Calculate the number of months between two dates
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of months (can be fractional)
 */
export function monthsBetween(startDate: Date, endDate: Date): number {
  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();
  const days = endDate.getDate() - startDate.getDate();
  
  let totalMonths = years * 12 + months;
  
  // Add fractional month based on days
  if (days !== 0) {
    const daysInMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
    totalMonths += days / daysInMonth;
  }
  
  return totalMonths;
}