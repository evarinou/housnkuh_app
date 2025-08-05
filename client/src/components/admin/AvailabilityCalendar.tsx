/**
 * @file AvailabilityCalendar.tsx
 * @purpose Interactive calendar component for displaying and selecting Mietfach availability with real-time data
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import axios from 'axios';

/**
 * Props for the AvailabilityCalendar component
 * @interface AvailabilityCalendarProps
 */
interface AvailabilityCalendarProps {
  mietfachType?: string;
  onDateSelect: (date: Date) => void;
  duration: number;
  selectedDate: Date;
}

/**
 * Availability data mapping date keys to available Mietfach counts
 * @interface AvailabilityData
 */
interface AvailabilityData {
  [dateKey: string]: number;
}

/**
 * Interactive availability calendar component for Mietfach booking system
 * 
 * Features:
 * - Real-time availability data fetching for 3-month period
 * - Color-coded availability indicators (good/limited/none)
 * - Type-specific filtering (Lagerservice/Versandservice)
 * - Duration-based availability checking
 * - German locale integration with date-fns
 * - Disabled past dates functionality
 * - Visual availability counts on calendar tiles
 * - Responsive design with custom styling
 * - Loading states during data fetching
 * 
 * @param {AvailabilityCalendarProps} props - Component props
 * @param {string} [props.mietfachType] - Optional Mietfach type filter
 * @param {(date: Date) => void} props.onDateSelect - Callback when date is selected
 * @param {number} props.duration - Booking duration in months
 * @param {Date} props.selectedDate - Currently selected date
 * @returns {JSX.Element} Interactive calendar with availability visualization
 * 
 * @complexity O(n*m) - Date range iteration with API calls for each date
 */
const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  mietfachType,
  onDateSelect,
  duration,
  selectedDate
}) => {
  const [availability, setAvailability] = useState<AvailabilityData>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailabilityData();
  }, [mietfachType, duration]);

  /**
   * Fetches availability data for 3-month period from API
   * @returns {Promise<void>}
   */
  const fetchAvailabilityData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      // Get availability for the next 3 months
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      
      const startDate = new Date();
      startDate.setDate(1); // Start from first day of current month
      
      const response = await axios.get(`${apiUrl}/admin/mietfaecher/availability`, {
        params: {
          startDate: startDate.toISOString(),
          duration: duration,
          type: mietfachType || 'all'
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        // Process availability data into calendar format
        const availabilityMap: AvailabilityData = {};
        
        // Create availability data for each day in the range
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateKey = format(currentDate, 'yyyy-MM-dd');
          
          // Check availability for this date by calling the API
          try {
            const dateAvailabilityResponse = await axios.post(
              `${apiUrl}/admin/check-mietfach-availability`,
              {
                startDate: currentDate.toISOString(),
                duration: duration,
                requestedTypes: mietfachType ? [mietfachType] : ['all']
              },
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            
            if (dateAvailabilityResponse.data.success) {
              const availableCount = dateAvailabilityResponse.data.mietfaecher.filter(
                (mf: any) => mf.available
              ).length;
              availabilityMap[dateKey] = availableCount;
            }
          } catch (error) {
            // If error, mark as 0 available
            availabilityMap[dateKey] = 0;
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        setAvailability(availabilityMap);
      }
    } catch (error) {
      console.error('Error fetching availability data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    const available = availability[dateKey];
    
    if (available === undefined) return null;
    
    return (
      <div className="calendar-tile-content">
        <div className={`availability-indicator ${getAvailabilityClass(available)}`}>
          {available > 0 && (
            <span className="availability-count">{available}</span>
          )}
        </div>
      </div>
    );
  };

  const getTileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';
    
    const dateKey = format(date, 'yyyy-MM-dd');
    const available = availability[dateKey];
    const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
    
    let classes = 'calendar-tile';
    
    if (isSelected) {
      classes += ' selected-date';
    }
    
    if (available !== undefined) {
      if (available === 0) {
        classes += ' no-availability';
      } else if (available < 3) {
        classes += ' limited-availability';
      } else {
        classes += ' good-availability';
      }
    }
    
    return classes;
  };

  const getAvailabilityClass = (count: number) => {
    if (count === 0) return 'bg-red-100 text-red-800';
    if (count < 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="availability-calendar">
      <div className="calendar-header mb-4">
        <h4 className="font-semibold text-lg">Verfügbarkeit im Überblick</h4>
        <p className="text-sm text-gray-600 mb-3">
          Wählen Sie ein Datum für die {duration}-monatige Buchung
          {mietfachType && ` (${mietfachType})`}
        </p>
        
        <div className="flex gap-4 text-sm mb-4">
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
            Gut verfügbar (3+)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
            Begrenzt (1-2)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
            Nicht verfügbar
          </span>
        </div>
      </div>
      
      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            Verfügbarkeit wird geladen...
          </div>
        </div>
      )}
      
      <div className="calendar-container">
        <Calendar
          onChange={(value) => {
            if (value instanceof Date) {
              onDateSelect(value);
            }
          }}
          value={selectedDate}
          tileContent={getTileContent}
          tileClassName={getTileClassName}
          tileDisabled={({ date }) => isPastDate(date)}
          minDate={new Date()}
          locale="de-DE"
          formatShortWeekday={(locale, date) => format(date, 'EEEEE', { locale: de })}
          formatMonthYear={(locale, date) => format(date, 'MMMM yyyy', { locale: de })}
        />
      </div>
      
      <style>{`
        .availability-calendar .react-calendar {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-family: inherit;
        }
        
        .availability-calendar .react-calendar__tile {
          position: relative;
          padding: 0.5rem 0.25rem;
          height: 3.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        
        .availability-calendar .react-calendar__tile:enabled:hover {
          background-color: #f3f4f6;
        }
        
        .availability-calendar .react-calendar__tile--active {
          background-color: #3b82f6 !important;
          color: white;
        }
        
        .availability-calendar .calendar-tile.selected-date {
          background-color: #3b82f6;
          color: white;
        }
        
        .availability-calendar .calendar-tile.no-availability {
          background-color: #fef2f2;
          color: #dc2626;
        }
        
        .availability-calendar .calendar-tile.limited-availability {
          background-color: #fffbeb;
          color: #d97706;
        }
        
        .availability-calendar .calendar-tile.good-availability {
          background-color: #f0fdf4;
          color: #16a34a;
        }
        
        .availability-indicator {
          font-size: 0.625rem;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          min-width: 1rem;
          text-align: center;
          margin-top: 0.125rem;
        }
        
        .availability-count {
          font-weight: 600;
        }
        
        .react-calendar__tile:disabled {
          background-color: #f9fafb;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default AvailabilityCalendar;