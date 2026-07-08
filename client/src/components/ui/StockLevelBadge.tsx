/**
 * @file StockLevelBadge.tsx
 * @purpose Displays Flourio stock level as a colored badge
 * @created 2026-03-31
 */

import React from 'react';
import { Package } from 'lucide-react';

export interface StockLevelBadgeProps {
  totalAmount?: number;
  lastPulledAt?: string;
}

const StockLevelBadge: React.FC<StockLevelBadgeProps> = ({ totalAmount, lastPulledAt }) => {
  if (totalAmount == null && !lastPulledAt) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
        <Package className="w-3 h-3 mr-1" />
        Kein Bestand
      </span>
    );
  }

  const amount = totalAmount ?? 0;
  const isStale = lastPulledAt && (Date.now() - new Date(lastPulledAt).getTime()) > 30 * 60 * 1000;

  let colorClasses: string;
  let label: string;

  if (amount === 0) {
    colorClasses = 'bg-red-100 text-red-700';
    label = 'Nicht vorrätig';
  } else if (amount <= 10) {
    colorClasses = 'bg-yellow-100 text-yellow-700';
    label = `${amount} Stk.`;
  } else {
    colorClasses = 'bg-green-100 text-green-700';
    label = `${amount} Stk.`;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${colorClasses}`}
      title={
        isStale
          ? 'Daten möglicherweise veraltet'
          : lastPulledAt
            ? `Letztes Update: ${new Date(lastPulledAt).toLocaleString('de-DE')}`
            : 'Noch kein Bestands-Update aus flour.io'
      }
    >
      <Package className="w-3 h-3 mr-1" />
      {label}
      {isStale && <span className="ml-1 text-orange-500">!</span>}
    </span>
  );
};

export default StockLevelBadge;
