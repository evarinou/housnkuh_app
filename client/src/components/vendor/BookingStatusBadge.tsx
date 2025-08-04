import React from 'react';
import { Clock, CheckCircle, Home, Archive } from 'lucide-react';

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

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

const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status];
  
  // Fallback config for unknown status values
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