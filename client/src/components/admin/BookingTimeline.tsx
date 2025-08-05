/**
 * @file BookingTimeline.tsx
 * @purpose Visual timeline component for displaying booking periods with progress indicators and status tracking
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React from 'react';
import { format, addMonths, isBefore, isAfter, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

/**
 * Props for the BookingTimeline component
 * @interface BookingTimelineProps
 */
interface BookingTimelineProps {
  startDate: Date;
  duration: number;
  mietfach?: {
    _id: string;
    bezeichnung: string;
    typ: string;
  };
  status?: 'scheduled' | 'active' | 'completed';
}

/**
 * Visual timeline component for booking period visualization and status tracking
 * 
 * Features:
 * - Interactive timeline visualization with progress bar
 * - Real-time status indicators (scheduled/active/completed)
 * - Date-based calculations using date-fns
 * - Progress visualization during active bookings
 * - Status-based color coding and icons
 * - Countdown displays for upcoming and ending bookings
 * - Mietfach information display
 * - German locale integration
 * - Responsive grid layout
 * - Alert notifications for soon-starting/ending bookings
 * 
 * @param {BookingTimelineProps} props - Component props
 * @param {Date} props.startDate - Booking start date
 * @param {number} props.duration - Booking duration in months
 * @param {Object} [props.mietfach] - Optional Mietfach details
 * @param {('scheduled'|'active'|'completed')} [props.status='scheduled'] - Booking status
 * @returns {JSX.Element} Timeline visualization with status and progress
 * 
 * @complexity O(1) - Simple date calculations and rendering
 */
const BookingTimeline: React.FC<BookingTimelineProps> = ({
  startDate,
  duration,
  mietfach,
  status = 'scheduled'
}) => {
  const endDate = addMonths(startDate, duration);
  const today = new Date();
  
  const isBeforeStart = isBefore(today, startDate);
  const isAfterEnd = isAfter(today, endDate);
  const isActive = !isBeforeStart && !isAfterEnd;
  
  const daysUntilStart = isBeforeStart ? differenceInDays(startDate, today) : 0;
  const daysUntilEnd = !isAfterEnd ? differenceInDays(endDate, today) : 0;
  
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'completed':
        return 'text-gray-600';
      default:
        return 'text-blue-600';
    }
  };
  
  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="booking-timeline p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Buchungszeitraum
        </h4>
        <div className={`flex items-center gap-1 text-sm font-medium ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="capitalize">{status === 'scheduled' ? 'Geplant' : status === 'active' ? 'Aktiv' : 'Abgeschlossen'}</span>
        </div>
      </div>
      
      {/* Timeline Visualization */}
      <div className="relative mb-4">
        {/* Timeline bar */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-300 rounded-full"></div>
        
        {/* Progress bar */}
        {isActive && (
          <div 
            className="absolute top-5 left-0 h-1 bg-blue-500 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, ((Date.now() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100)}%`
            }}
          ></div>
        )}
        
        {/* Timeline points */}
        <div className="relative flex justify-between">
          {/* Today marker (if relevant) */}
          {isActive && (
            <div className="absolute" style={{ left: `${Math.min(100, ((Date.now() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100)}%` }}>
              <div className="w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1/2 relative">
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <p className="text-xs font-medium text-blue-600">Heute</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Start date */}
          <div className="timeline-point">
            <div className={`w-4 h-4 rounded-full border-2 ${
              isBeforeStart ? 'bg-white border-blue-500' : 'bg-green-500 border-green-500'
            }`}></div>
            <div className="mt-2 text-center">
              <p className="text-sm font-semibold text-gray-900">
                Start
              </p>
              <p className="text-xs text-gray-600">
                {format(startDate, 'dd.MM.yyyy', { locale: de })}
              </p>
            </div>
          </div>
          
          {/* End date */}
          <div className="timeline-point">
            <div className={`w-4 h-4 rounded-full border-2 ${
              isAfterEnd ? 'bg-gray-500 border-gray-500' : 'bg-white border-red-500'
            }`}></div>
            <div className="mt-2 text-center">
              <p className="text-sm font-semibold text-gray-900">
                Ende
              </p>
              <p className="text-xs text-gray-600">
                {format(endDate, 'dd.MM.yyyy', { locale: de })}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex flex-col">
          <span className="font-medium text-gray-700">Laufzeit</span>
          <span className="text-gray-600">{duration} Monat{duration !== 1 ? 'e' : ''}</span>
        </div>
        
        {mietfach && (
          <div className="flex flex-col">
            <span className="font-medium text-gray-700">Mietfach</span>
            <span className="text-gray-600">{mietfach.bezeichnung}</span>
            <span className="text-xs text-gray-500">{mietfach.typ}</span>
          </div>
        )}
        
        <div className="flex flex-col">
          <span className="font-medium text-gray-700">Status</span>
          {isBeforeStart && (
            <span className="text-blue-600">
              Startet in {daysUntilStart} Tag{daysUntilStart !== 1 ? 'en' : ''}
            </span>
          )}
          {isActive && (
            <span className="text-green-600">
              Läuft noch {daysUntilEnd} Tag{daysUntilEnd !== 1 ? 'e' : ''}
            </span>
          )}
          {isAfterEnd && (
            <span className="text-gray-600">Beendet</span>
          )}
        </div>
      </div>
      
      {/* Additional Info */}
      {isBeforeStart && daysUntilStart <= 7 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Hinweis:</strong> Diese Buchung startet in {daysUntilStart} Tag{daysUntilStart !== 1 ? 'en' : ''}. 
            Stellen Sie sicher, dass alle Vorbereitungen abgeschlossen sind.
          </p>
        </div>
      )}
      
      {isActive && daysUntilEnd <= 7 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800">
            <strong>Bald endend:</strong> Diese Buchung endet in {daysUntilEnd} Tag{daysUntilEnd !== 1 ? 'en' : ''}. 
            Kontaktieren Sie den Vendor für eine mögliche Verlängerung.
          </p>
        </div>
      )}
    </div>
  );
};

export default BookingTimeline;