import React, { useMemo, useCallback } from 'react';
import { BookingStatus } from '../../types/booking';

interface StatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  active: number;
  completed: number;
}

interface StatusFilterTabsProps {
  activeFilter: BookingStatus | 'all';
  onFilterChange: (filter: BookingStatus | 'all') => void;
  counts: StatusCounts;
}

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

const StatusFilterTabs: React.FC<StatusFilterTabsProps> = React.memo(({ activeFilter, onFilterChange, counts }) => {
  // Memoize tabs array to prevent recreation on every render
  const tabs = useMemo(() => 
    (Object.keys(filterConfig) as (keyof StatusCounts)[]).map(key => ({
      key,
      label: filterConfig[key].label,
      count: counts[key],
      color: filterConfig[key].color
    })), [counts]
  );

  // Memoize click handlers for each tab
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