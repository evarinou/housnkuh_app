import React, { useState } from 'react';
import './DateRangePicker.css';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (dateRange: DateRange) => void;
  maxDate?: Date;
  minDate?: Date;
  allowFuture?: boolean;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  maxDate,
  minDate = new Date(2020, 0, 1),
  allowFuture = false
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = new Date(event.target.value);
    if (newStartDate <= endDate) {
      onChange({ startDate: newStartDate, endDate });
    }
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = new Date(event.target.value);
    if (newEndDate >= startDate) {
      onChange({ startDate, endDate: newEndDate });
    }
  };

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