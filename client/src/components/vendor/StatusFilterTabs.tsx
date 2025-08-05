/**
 * @file StatusFilterTabs.tsx
 * @purpose Tabbed filter navigation component for booking status filtering with performance optimization
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { useMemo, useCallback } from 'react';
import { BookingStatus } from '../../types/booking';

/**
 * Interface for status count data
 * @interface StatusCounts
 * @property {number} all - Total count of all bookings
 * @property {number} pending - Count of pending bookings
 * @property {number} confirmed - Count of confirmed bookings  
 * @property {number} active - Count of active bookings
 * @property {number} completed - Count of completed bookings
 */
interface StatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  active: number;
  completed: number;
}

/**
 * Props interface for the StatusFilterTabs component
 * @interface StatusFilterTabsProps
 * @property {BookingStatus | 'all'} activeFilter - Currently active filter
 * @property {function} onFilterChange - Callback function when filter changes
 * @property {StatusCounts} counts - Count data for each status type
 */
interface StatusFilterTabsProps {
  activeFilter: BookingStatus | 'all';
  onFilterChange: (filter: BookingStatus | 'all') => void;
  counts: StatusCounts;
}

/**
 * Filter configuration for status tabs
 * Defines labels and color schemes for each booking status filter
 * 
 * @const filterConfig
 * @property {object} all - Gray styling for all bookings view
 * @property {object} pending - Yellow styling for pending bookings
 * @property {object} confirmed - Green styling for confirmed bookings
 * @property {object} active - Blue styling for active bookings
 * @property {object} completed - Gray styling for completed bookings
 */
const filterConfig = {
  all: {
    label: 'Alle',
    color: 'text-gray-600 border-gray-300 hover:text-gray-800 hover:border-gray-400'
  },
  pending: {
    label: 'In Bearbeitung',
    color: 'text-yellow-600 border-yellow-300 hover:text-yellow-800 hover:border-yellow-400'
  },
  confirmed: {
    label: 'Bestätigt',
    color: 'text-green-600 border-green-300 hover:text-green-800 hover:border-green-400'
  },
  active: {
    label: 'Aktiv',
    color: 'text-blue-600 border-blue-300 hover:text-blue-800 hover:border-blue-400'
  },
  completed: {
    label: 'Abgeschlossen',
    color: 'text-gray-600 border-gray-300 hover:text-gray-800 hover:border-gray-400'
  }
};

/**
 * StatusFilterTabs component providing tabbed navigation for booking status filtering
 * 
 * @component
 * @param {StatusFilterTabsProps} props - Component props containing filter state and counts
 * @returns {JSX.Element} Tabbed navigation interface with count badges
 * 
 * @example
 * <StatusFilterTabs 
 *   activeFilter="pending"
 *   onFilterChange={(filter) => setActiveFilter(filter)}
 *   counts={{ all: 25, pending: 5, confirmed: 10, active: 8, completed: 2 }}
 * />
 * 
 * @features
 * - Color-coded status tabs with hover effects
 * - Count badges showing number of bookings per status
 * - Performance optimized with React.memo and useMemo
 * - Responsive horizontal scrolling on mobile
 * - Accessibility support with aria-current
 * - Memoized click handlers to prevent re-renders
 * 
 * @performance
 * - React.memo prevents unnecessary re-renders
 * - useMemo caches tabs array computation
 * - useCallback memoizes click handler creation
 * 
 * @accessibility
 * - aria-current="page" for active tab
 * - Keyboard navigation support via button elements
 * - High contrast color combinations
 * 
 * @complexity O(1) - Fixed number of status tabs (5)
 */
const StatusFilterTabs: React.FC<StatusFilterTabsProps> = React.memo(({ activeFilter, onFilterChange, counts }) => {
  /**
   * Memoized tabs array to prevent recreation on every render
   * Maps filter configuration to tab data with current counts
   */
  const tabs = useMemo(() => 
    (Object.keys(filterConfig) as (keyof StatusCounts)[]).map(key => ({
      key,
      label: filterConfig[key].label,
      count: counts[key],
      color: filterConfig[key].color
    })), [counts]
  );

  /**
   * Creates memoized click handlers for each tab to prevent re-renders
   * @param {keyof StatusCounts} key - Status key for the click handler
   * @returns {function} Memoized click handler function
   */
  const createClickHandler = useCallback((key: keyof StatusCounts) => 
    () => onFilterChange(key as BookingStatus | 'all'), 
    [onFilterChange]
  );

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8 overflow-x-auto">
        {tabs.map(({ key, label, count, color }) => {
          const isActive = activeFilter === key;
          const activeClasses = isActive 
            ? 'border-blue-500 text-blue-600' 
            : color;
          
          return (
            <button
              key={key}
              onClick={createClickHandler(key)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeClasses}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {label}
              {count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
});

export default StatusFilterTabs;