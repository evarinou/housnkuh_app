import React from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

export interface ErrorMessageProps {
  message: string;
  title?: string;
  variant?: 'error' | 'warning' | 'info';
  onClose?: () => void;
  onRetry?: () => void;
  className?: string;
  showIcon?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title = 'Fehler',
  variant = 'error',
  onClose,
  onRetry,
  className = '',
  showIcon = true,
}) => {
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