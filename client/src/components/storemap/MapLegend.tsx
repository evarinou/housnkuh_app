/**
 * @file MapLegend.tsx
 * @purpose Legend for the store map: Mietfach types and occupancy colors
 * @created 2026-06-11
 */

import React from 'react';
import { TYP_COLORS } from './storeLayout';
import { MietfachTyp } from './types';

const MapLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
      {(Object.keys(TYP_COLORS) as MietfachTyp[]).map((typ) => (
        <span key={typ} className="inline-flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded-sm inline-block border border-black/10"
            style={{ backgroundColor: TYP_COLORS[typ].belegt }}
          />
          {TYP_COLORS[typ].label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 ml-2 pl-4 border-l border-gray-200">
        <span className="w-3.5 h-3.5 rounded-sm inline-block border border-black/10 bg-gray-100" />
        Helle Farbe = frei
      </span>
    </div>
  );
};

export default MapLegend;
