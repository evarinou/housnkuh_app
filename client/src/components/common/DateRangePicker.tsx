/**
 * @file DateRangePicker.tsx
 * @purpose Advanced date range picker component with preset options and custom date selection
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { useState } from 'react';
import './DateRangePicker.css';

/**
 * Interface representing a date range with start and end dates
 * @interface DateRange
 */
interface DateRange {
  /** Start date of the range */
  startDate: Date;
  /** End date of the range */
  endDate: Date;
}

/**
 * Props interface for DateRangePicker component
 * @interface DateRangePickerProps
 */
interface DateRangePickerProps {
  /** Currently selected start date */
  startDate: Date;
  /** Currently selected end date */
  endDate: Date;
  /** Callback function called when date range changes */
  onChange: (dateRange: DateRange) => void;
  /** Optional maximum selectable date */
  maxDate?: Date;
  /** Optional minimum selectable date (defaults to 2020-01-01) */
  minDate?: Date;
  /** Whether future dates are allowed for selection (defaults to false) */
  allowFuture?: boolean;
}

/**
 * Advanced date range picker component with preset options and custom date selection.
 * 
 * Features:
 * - Dropdown interface with toggle button showing current range
 * - Preset date ranges: heute, letzte 7 Tage, dieser Monat, etc.
 * - Custom date input fields with validation
 * - German date formatting and labels
 * - Optional future date support
 * - Min/max date constraints
 * - FontAwesome icons for UI elements
 * 
 * Preset Options:
 * - Heute: Current day only
 * - Letzte 7 Tage: Last 7 days from today
 * - Dieser Monat: Current month from 1st to today
 * - Letzter Monat: Previous month (full month)
 * - Dieses Quartal: Current quarter from start to today
 * - Dieses Jahr: Current year from Jan 1st to today
 * - Nächste 6 Monate: Next 6 months (if allowFuture=true)
 * - Bis Ende nächstes Jahr: Until end of next year (if allowFuture=true)
 * 
 * @component
 * @param {DateRangePickerProps} props - Component props
 * @returns {JSX.Element} Rendered date range picker component
 */
export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  maxDate,
  minDate = new Date(2020, 0, 1),
  allowFuture = false
}: DateRangePickerProps) {
  /** State controlling dropdown visibility */
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Formats a Date object to German locale string format (DD.MM.YYYY)
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string in DD.MM.YYYY format
   */
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  /**
   * Formats a Date object to ISO string format for HTML date inputs (YYYY-MM-DD)
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string in YYYY-MM-DD format
   */
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  /**
   * Handles start date input changes with validation
   * Only updates if new start date is not after the current end date
   * @param {React.ChangeEvent<HTMLInputElement>} event - Input change event
   */
  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = new Date(event.target.value);
    if (newStartDate <= endDate) {
      onChange({ startDate: newStartDate, endDate });
    }
  };

  /**
   * Handles end date input changes with validation
   * Only updates if new end date is not before the current start date
   * @param {React.ChangeEvent<HTMLInputElement>} event - Input change event
   */
  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = new Date(event.target.value);
    if (newEndDate >= startDate) {
      onChange({ startDate, endDate: newEndDate });
    }
  };

  /**
   * Handles preset button clicks to set predefined date ranges
   * Calculates appropriate start and end dates based on preset type
   * Respects allowFuture flag for future date presets
   * @param {string} preset - Preset identifier (today, week, month, etc.)
   */
  const handlePresetClick = (preset: string) => {
    const today = new Date();
    let newStartDate: Date;
    let newEndDate = today;

    switch (preset) {
      case 'today':
        newStartDate = today;
        break;
      case 'week':
        newStartDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        newStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
        newStartDate = new Date(today.getFullYear(), quarterStartMonth, 1);
        break;
      case 'year':
        newStartDate = new Date(today.getFullYear(), 0, 1);
        break;
      case 'lastMonth':
        newStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        newEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'nextYear':
        if (allowFuture) {
          newStartDate = new Date(today.getFullYear(), 0, 1);
          newEndDate = new Date(today.getFullYear() + 1, 11, 31);
        } else {
          return;
        }
        break;
      case 'next6Months':
        if (allowFuture) {
          newStartDate = today;
          newEndDate = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
        } else {
          return;
        }
        break;
      default:
        return;
    }

    onChange({ startDate: newStartDate, endDate: newEndDate });
    setIsOpen(false);
  };

  return (
    <div className="date-range-picker">
      <button
        className="date-range-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className="fas fa-calendar-alt"></i>
        <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </button>

      {isOpen && (
        <div className="date-range-dropdown">
          <div className="date-range-presets">
            <h4>Schnellauswahl</h4>
            <button onClick={() => handlePresetClick('today')}>Heute</button>
            <button onClick={() => handlePresetClick('week')}>Letzte 7 Tage</button>
            <button onClick={() => handlePresetClick('month')}>Dieser Monat</button>
            <button onClick={() => handlePresetClick('lastMonth')}>Letzter Monat</button>
            <button onClick={() => handlePresetClick('quarter')}>Dieses Quartal</button>
            <button onClick={() => handlePresetClick('year')}>Dieses Jahr</button>
            {allowFuture && (
              <>
                <button onClick={() => handlePresetClick('next6Months')}>Nächste 6 Monate</button>
                <button onClick={() => handlePresetClick('nextYear')}>Bis Ende nächstes Jahr</button>
              </>
            )}
          </div>

          <div className="date-range-inputs">
            <h4>Benutzerdefiniert</h4>
            <div className="input-group">
              <label>Von:</label>
              <input
                type="date"
                value={formatDateForInput(startDate)}
                onChange={handleStartDateChange}
                min={formatDateForInput(minDate)}
                max={formatDateForInput(endDate)}
              />
            </div>
            <div className="input-group">
              <label>Bis:</label>
              <input
                type="date"
                value={formatDateForInput(endDate)}
                onChange={handleEndDateChange}
                min={formatDateForInput(startDate)}
                max={maxDate ? formatDateForInput(maxDate) : (allowFuture ? undefined : formatDateForInput(new Date()))}
              />
            </div>
          </div>

          <div className="date-range-actions">
            <button 
              className="cancel-button"
              onClick={() => setIsOpen(false)}
            >
              Abbrechen
            </button>
            <button 
              className="apply-button"
              onClick={() => setIsOpen(false)}
            >
              Anwenden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}