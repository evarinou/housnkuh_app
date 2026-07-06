/**
 * @file SyncStatusBadge.tsx
 * @purpose Sync status badge component for FlourIO article synchronization with visual indicators
 * @created 2025-10-17
 * @modified 2025-10-17
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

export type SyncStatus = 'synced' | 'pending' | 'error' | 'never';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  lastSyncedAt?: string;
  errorMessage?: string;
  showTooltip?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  className: string;
  icon: React.ComponentType<any>;
  tooltip: string;
}

const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  lastSyncedAt,
  errorMessage,
  showTooltip = true,
  className = ''
}) => {
  const [showTooltipState, setShowTooltipState] = React.useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const statusConfig: Record<SyncStatus, StatusConfig> = {
    synced: {
      label: 'Synchronisiert',
      className: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
      tooltip: lastSyncedAt
        ? `Letzte Synchronisation: ${formatDate(lastSyncedAt)}`
        : 'Mit FlourIO synchronisiert'
    },
    pending: {
      label: 'Ausstehend',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: Clock,
      tooltip: 'Synchronisation ausstehend'
    },
    error: {
      label: 'Fehler',
      className: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircle,
      tooltip: errorMessage || 'Fehler bei der Synchronisation'
    },
    never: {
      label: 'Nicht synchronisiert',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: AlertCircle,
      tooltip: 'Noch nie mit FlourIO synchronisiert'
    }
  };

  const config = statusConfig[status];
  const IconComponent = config.icon;

  const badgeContent = (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border
        ${config.className}
        ${className}
      `}
      role="status"
      aria-label={`Status: ${config.label}. ${config.tooltip}`}
      onMouseEnter={() => setShowTooltipState(true)}
      onMouseLeave={() => setShowTooltipState(false)}
    >
      <IconComponent className="w-4 h-4" aria-hidden="true" />
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
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg max-w-xs"
            role="tooltip"
            aria-hidden="true"
          >
            <div className="text-left">
              {config.tooltip}
              {status === 'error' && errorMessage && (
                <div className="mt-1 text-red-300 text-xs">{errorMessage}</div>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SyncStatusBadge;
