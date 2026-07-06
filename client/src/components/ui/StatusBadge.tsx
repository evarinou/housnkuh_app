/**
 * @file StatusBadge.tsx
 * @purpose Payment status badge component with visual indicators, tooltips, and animations
 * @created 2025-01-09
 * @modified 2025-01-09
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface StatusBadgeProps {
  status: InvoiceStatus;
  dueDate?: string;
  paidDate?: string;
  showTooltip?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  className: string;
  icon: string;
  tooltip: string;
  strikethrough?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  dueDate, 
  paidDate,
  showTooltip = true,
  className = '' 
}) => {
  const [showTooltipState, setShowTooltipState] = React.useState(false);

  // Auto-detect overdue status based on dueDate
  const isOverdue = React.useMemo(() => {
    if (status === 'paid' || status === 'cancelled' || !dueDate) return false;
    return new Date(dueDate) < new Date() && status !== 'overdue';
  }, [status, dueDate]);

  // Use overdue status if detected
  const effectiveStatus = isOverdue ? 'overdue' : status;

  const statusConfig: Record<InvoiceStatus, StatusConfig> = {
    draft: { 
      label: 'Entwurf', 
      className: 'bg-gray-100 text-gray-800 border-gray-200', 
      icon: '📝',
      tooltip: 'Rechnung wurde erstellt, aber noch nicht versendet'
    },
    sent: { 
      label: 'Versendet', 
      className: 'bg-blue-100 text-blue-800 border-blue-200', 
      icon: '📤',
      tooltip: 'Rechnung wurde an den Kunden versendet'
    },
    paid: { 
      label: 'Bezahlt', 
      className: 'bg-green-100 text-green-800 border-green-200', 
      icon: '✅',
      tooltip: paidDate ? `Rechnung wurde am ${new Date(paidDate).toLocaleDateString('de-DE')} bezahlt` : 'Rechnung wurde bezahlt'
    },
    overdue: { 
      label: 'Überfällig', 
      className: 'bg-red-100 text-red-800 border-red-200', 
      icon: '⚠️',
      tooltip: dueDate ? `Rechnung ist seit dem ${new Date(dueDate).toLocaleDateString('de-DE')} überfällig` : 'Rechnung ist überfällig'
    },
    cancelled: { 
      label: 'Storniert', 
      className: 'bg-gray-100 text-gray-600 border-gray-200', 
      icon: '❌',
      tooltip: 'Rechnung wurde storniert',
      strikethrough: true
    }
  };

  const config = statusConfig[effectiveStatus];

  const badgeContent = (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border
        ${config.className}
        ${config.strikethrough ? 'line-through' : ''}
        ${className}
      `}
      role="status"
      aria-label={`Status: ${config.label}. ${config.tooltip}`}
      onMouseEnter={() => setShowTooltipState(true)}
      onMouseLeave={() => setShowTooltipState(false)}
    >
      <span className="text-xs" aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </motion.span>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <div className="relative inline-block">
      {badgeContent}
      <AnimatePresence>
        {showTooltipState && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg"
            role="tooltip"
            aria-hidden="true"
          >
            {config.tooltip}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusBadge;