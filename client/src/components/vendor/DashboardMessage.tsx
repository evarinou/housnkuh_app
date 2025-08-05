/**
 * @file DashboardMessage.tsx
 * @purpose Reusable message component for dashboard notifications with type-based styling and dismissal functionality
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { IDashboardMessage } from '../../types/booking';

/**
 * Props interface for the DashboardMessage component
 * @interface DashboardMessageProps
 * @property {IDashboardMessage} message - Message data containing type, title, content, and dismissal settings
 * @property {function} [onDismiss] - Optional callback function for message dismissal
 */
interface DashboardMessageProps {
  message: IDashboardMessage;
  onDismiss?: () => void;
}

/**
 * DashboardMessage component for displaying contextual notifications in vendor dashboard
 * 
 * @component
 * @param {DashboardMessageProps} props - Component props containing message data and dismissal callback
 * @returns {JSX.Element} Styled message component with appropriate icon and colors
 * 
 * @description
 * Reusable notification component for displaying dashboard messages with consistent styling
 * based on message type. Supports dismissible messages with close functionality.
 * 
 * @features
 * - Type-based styling (success: green, warning: yellow, error: red, info: blue)
 * - Contextual Lucide icons for each message type
 * - Optional dismissal functionality with close button
 * - Accessible design with aria-labels and focus management
 * - Responsive layout with proper spacing
 * - German localized accessibility labels
 * 
 * @message_types
 * - success: Green styling with CheckCircle icon for positive actions
 * - warning: Yellow styling with AlertTriangle icon for cautions
 * - error: Red styling with AlertCircle icon for errors
 * - info: Blue styling with Info icon for general information
 * 
 * @accessibility
 * - aria-label on dismiss button ("Nachricht schließen")
 * - Focus ring styling for keyboard navigation
 * - High contrast color combinations
 * - Clear visual hierarchy with icons and text
 * 
 * @complexity O(1) - Simple message rendering with fixed styling options
 */
const DashboardMessage: React.FC<DashboardMessageProps> = ({ message, onDismiss }) => {
  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColorClasses = () => {
    switch (message.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getColorClasses()}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {message.title}
          </h3>
          <div className="mt-1 text-sm">
            {message.message}
          </div>
        </div>
        {message.dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-gray-100 transition-colors"
                aria-label="Nachricht schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardMessage;