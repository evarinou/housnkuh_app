/**
 * @file BookingStatusBadge.tsx
 * @purpose Status badge component for booking state visualization with color-coded icons and labels
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React from 'react';
import { Clock, CheckCircle, Home, Archive } from 'lucide-react';

/**
 * Type definition for booking status values
 * @typedef {'pending' | 'confirmed' | 'active' | 'completed'} BookingStatus
 */
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed';

/**
 * Props interface for the BookingStatusBadge component
 * @interface BookingStatusBadgeProps
 * @property {BookingStatus} status - Current booking status
 * @property {string} className - Optional additional CSS classes
 */
interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

/**
 * Status configuration mapping for booking states
 * Defines visual appearance and icons for each booking status
 * 
 * @const statusConfig
 * @property {object} pending - Yellow badge for bookings in processing
 * @property {object} confirmed - Green badge for confirmed bookings  
 * @property {object} active - Blue badge for currently active bookings
 * @property {object} completed - Gray badge for finished bookings
 */
const statusConfig = {
  pending: {
    label: 'In Bearbeitung',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  confirmed: {
    label: 'Bestätigt',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  active: {
    label: 'Aktiv',
    color: 'bg-blue-100 text-blue-800',
    icon: Home
  },
  completed: {
    label: 'Abgeschlossen',
    color: 'bg-gray-100 text-gray-800',
    icon: Archive
  }
};

/**
 * BookingStatusBadge component displaying booking status with color-coded badges
 * 
 * @component
 * @param {BookingStatusBadgeProps} props - Component props containing status and styling
 * @returns {JSX.Element} Color-coded status badge with icon and label
 * 
 * @example
 * <BookingStatusBadge status="confirmed" />
 * <BookingStatusBadge status="pending" className="ml-2" />
 * 
 * @features
 * - Color-coded status visualization (yellow, green, blue, gray)
 * - Icon representation for each status state
 * - German localized status labels
 * - Fallback handling for unknown status values
 * - Custom className support for additional styling
 * 
 * @status_flow
 * pending → confirmed → active → completed
 * 
 * @accessibility
 * - Semantic icon usage for visual status indication
 * - High contrast color combinations
 * - Readable German status labels
 * 
 * @complexity O(1) - Simple status lookup and rendering
 */
const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status];
  
  /**
   * Fallback handling for unknown status values
   * Logs warning and displays generic badge with provided status text
   */
  if (!config) {
    console.warn(`Unknown booking status: "${status}". Using fallback.`);
    const fallbackConfig = {
      label: status || 'Unbekannt',
      color: 'bg-gray-100 text-gray-800',
      icon: Clock
    };
    const Icon = fallbackConfig.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${fallbackConfig.color} ${className}`}>
        <Icon className="w-4 h-4 mr-1" />
        {fallbackConfig.label}
      </span>
    );
  }
  
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color} ${className}`}>
      <Icon className="w-4 h-4 mr-1" />
      {config.label}
    </span>
  );
};

export default BookingStatusBadge;