/**
 * @file ExportButton.tsx
 * @purpose Revenue data export component with CSV and PDF format support, progress tracking, and notifications
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React, { useState } from 'react';
import './ExportButton.css';

/**
 * Date range structure for export filtering
 * @interface DateRange
 */
interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Props for the ExportButton component
 * @interface ExportButtonProps
 */
interface ExportButtonProps {
  dateRange: DateRange;
}

/**
 * Props for notification display component
 * @interface NotificationProps
 */
interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

/**
 * Notification toast component for export feedback
 * 
 * Features:
 * - Success and error notification types with color coding
 * - FontAwesome icons for visual indication
 * - Auto-dismiss functionality
 * - Manual close button
 * 
 * @param {NotificationProps} props - Notification configuration
 * @param {string} props.message - Message text to display
 * @param {('success'|'error')} props.type - Notification type for styling
 * @param {() => void} props.onClose - Callback for closing notification
 * @returns {JSX.Element} Toast notification with message and close button
 */
const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        <i className={`fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
        <span>{message}</span>
      </div>
      <button onClick={onClose} className="notification-close">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

/**
 * Revenue data export component with multiple format support and comprehensive user experience
 * 
 * Features:
 * - Multi-format export support (CSV for spreadsheets, PDF for reports)
 * - Dropdown menu with format selection and descriptions
 * - Real-time progress tracking with animated progress bar
 * - Automatic file download with intelligent naming
 * - German date formatting and localization
 * - Success/error notifications with auto-dismiss
 * - Loading states with spinner animation
 * - Click-outside menu handling
 * - API integration with authentication headers
 * - Error handling with user-friendly messages
 * - File blob handling and URL management
 * - Date range display for user confirmation
 * 
 * @param {ExportButtonProps} props - Component props
 * @param {DateRange} props.dateRange - Date range for export filtering
 * @returns {JSX.Element} Export button with dropdown menu and progress tracking
 * 
 * @complexity O(1) - Export processing handled by server-side API
 */
export default function ExportButton({ dateRange }: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    setExportProgress(0);
    setShowMenu(false);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(
        `${apiUrl}/admin/revenue/export?format=${format}&startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        }
      );

      clearInterval(progressInterval);
      setExportProgress(100);

      if (!response.ok) {
        throw new Error(`Export fehlgeschlagen: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mieteinnahmen_${format}_${formatDateForFilename(dateRange.startDate)}_${formatDateForFilename(dateRange.endDate)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification('Export erfolgreich heruntergeladen', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification(
        error instanceof Error ? error.message : 'Export fehlgeschlagen', 
        'error'
      );
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const formatDateForFilename = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDateRange = (): string => {
    const start = dateRange.startDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const end = dateRange.endDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${start} bis ${end}`;
  };

  const handleClickOutside = (event: React.MouseEvent) => {
    if ((event.target as Element).closest('.export-button-container') === null) {
      setShowMenu(false);
    }
  };

  React.useEffect(() => {
    if (showMenu) {
      document.addEventListener('click', handleClickOutside as any);
      return () => document.removeEventListener('click', handleClickOutside as any);
    }
  }, [showMenu]);

  return (
    <>
      <div className="export-button-container">
        <button
          className="export-button"
          onClick={() => setShowMenu(!showMenu)}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <div className="spinner"></div>
              Exportiere...
            </>
          ) : (
            <>
              <i className="fas fa-download"></i>
              Export
            </>
          )}
        </button>

        {showMenu && !exporting && (
          <div className="export-menu">
            <div className="export-menu-header">
              <h4>Daten exportieren</h4>
              <p>Zeitraum: {formatDateRange()}</p>
            </div>
            
            <div className="export-options">
              <button 
                onClick={() => handleExport('csv')}
                className="export-option"
              >
                <div className="export-option-icon">
                  <i className="fas fa-file-csv"></i>
                </div>
                <div className="export-option-content">
                  <h5>CSV Export</h5>
                  <p>Tabellendaten für Excel/Calc</p>
                </div>
              </button>
              
              <button 
                onClick={() => handleExport('pdf')}
                className="export-option"
              >
                <div className="export-option-icon">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div className="export-option-content">
                  <h5>PDF Report</h5>
                  <p>Formatierter Umsatzbericht</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {exporting && (
          <div className="export-progress">
            <div className="progress-bar-container">
              <div 
                className="progress-bar"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
            <span className="progress-text">{exportProgress}%</span>
          </div>
        )}
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
}