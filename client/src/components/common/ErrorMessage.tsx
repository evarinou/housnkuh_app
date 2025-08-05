/**
 * @file ErrorMessage.tsx
 * @purpose Reusable error message display component with variants for different message types
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

/**
 * Props interface for ErrorMessage component
 * @interface ErrorMessageProps
 */
export interface ErrorMessageProps {
  /** The error message text to display */
  message: string;
  /** Optional title/header for the error message (defaults to 'Fehler') */
  title?: string;
  /** Visual variant of the error message - affects colors and styling */
  variant?: 'error' | 'warning' | 'info';
  /** Optional callback function called when close button is clicked */
  onClose?: () => void;
  /** Optional callback function called when retry button is clicked */
  onRetry?: () => void;
  /** Additional CSS classes to apply to the root element */
  className?: string;
  /** Whether to show the alert triangle icon (defaults to true) */
  showIcon?: boolean;
}

/**
 * Reusable error message component for displaying various types of messages with consistent styling.
 * 
 * Features:
 * - Three visual variants: error (red), warning (yellow), info (blue)
 * - Optional close button with callback
 * - Optional retry button with callback
 * - Consistent German text labels
 * - Lucide icons for visual consistency
 * - Tailwind CSS styling with hover effects
 * - Flexible styling through className prop
 * 
 * @component
 * @param {ErrorMessageProps} props - Component props
 * @returns {JSX.Element} Rendered error message component
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title = 'Fehler',
  variant = 'error',
  onClose,
  onRetry,
  className = '',
  showIcon = true,
}) => {
  /**
   * Returns appropriate Tailwind CSS classes based on the selected variant
   * @returns {string} CSS classes for background, border and text colors
   */
  const getVariantClasses = () => {
    switch (variant) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  /**
   * Returns appropriate icon color class based on the selected variant
   * @returns {string} CSS class for icon color
   */
  const getIconColor = () => {
    switch (variant) {
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-red-500';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getVariantClasses()} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {showIcon && (
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${getIconColor()}`} />
          )}
          <div className="flex-1">
            <h3 className="font-medium text-sm">{title}</h3>
            <p className="text-sm mt-1">{message}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center space-x-1 text-xs px-2 py-1 rounded hover:bg-white/50 transition-colors"
              title="Erneut versuchen"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Wiederholen</span>
            </button>
          )}
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;