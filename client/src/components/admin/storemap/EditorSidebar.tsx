/**
 * @file EditorSidebar.tsx
 * @purpose Sidebar of the store map editor: unpositioned Mietfächer + inspector for selection
 * @created 2026-06-11
 */

import React from 'react';
import { MapPin, RotateCw, Trash2 } from 'lucide-react';
import { MietfachPosition } from '../../storemap/types';
import { TYP_COLORS } from '../../storemap/storeLayout';
import { EditorItemData } from './EditorItem';
import { snapRotation, clampToFloor } from './storeMapEditorUtils';

interface EditorSidebarProps {
  unpositioned: Array<Pick<EditorItemData, 'id' | 'bezeichnung' | 'typ'>>;
  selected: EditorItemData | null;
  onPlace: (id: string) => void;
  onChangePosition: (id: string, position: MietfachPosition) => void;
  onRemoveFromMap: (id: string) => void;
}

const NUMBER_FIELDS: Array<{ key: keyof MietfachPosition; label: string; step: number; min?: number }> = [
  { key: 'x', label: 'X (m)', step: 0.1 },
  { key: 'y', label: 'Y (m)', step: 0.1 },
  { key: 'w', label: 'Breite (m)', step: 0.1, min: 0.2 },
  { key: 'd', label: 'Tiefe (m)', step: 0.1, min: 0.2 },
  { key: 'h', label: 'Höhe (m)', step: 0.1, min: 0.2 },
  { key: 'rotation', label: 'Drehung (°)', step: 15 }
];

const EditorSidebar: React.FC<EditorSidebarProps> = ({
  unpositioned,
  selected,
  onPlace,
  onChangePosition,
  onRemoveFromMap
}) => {
  const updateField = (key: keyof MietfachPosition, value: number) => {
    if (!selected || !Number.isFinite(value)) return;
    const next = { ...selected.position, [key]: value };
    onChangePosition(selected.id, clampToFloor(next));
  };

  return (
    <div className="space-y-6">
      {selected && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-secondary">{selected.bezeichnung}</h3>
            <span className="text-xs text-gray-500">
              {(TYP_COLORS[selected.typ] || TYP_COLORS.sonstiges).label}
            </span>
          </div>
          {selected.vendorName && (
            <p className="text-sm text-gray-500 mb-2">Belegt von {selected.vendorName}</p>
          )}

          <div className="grid grid-cols-2 gap-2 mt-3">
            {NUMBER_FIELDS.map((field) => (
              <label key={field.key} className="text-xs text-gray-600">
                {field.label}
                <input
                  type="number"
                  step={field.step}
                  min={field.min}
                  value={selected.position[field.key]}
                  onChange={(event) => updateField(field.key, parseFloat(event.target.value))}
                  className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() =>
                updateField('rotation', snapRotation(selected.position.rotation + 15))
              }
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              <RotateCw className="w-4 h-4" /> +15°
            </button>
            <button
              onClick={() => onRemoveFromMap(selected.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" /> Entfernen
            </button>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-secondary mb-2">
          Nicht platzierte Fächer ({unpositioned.length})
        </h3>
        {unpositioned.length === 0 ? (
          <p className="text-sm text-gray-500">Alle Mietfächer sind auf der Karte platziert.</p>
        ) : (
          <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {unpositioned.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium text-secondary">{item.bezeichnung}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {(TYP_COLORS[item.typ] || TYP_COLORS.sonstiges).label}
                  </span>
                </div>
                <button
                  onClick={() => onPlace(item.id)}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <MapPin className="w-4 h-4" /> Platzieren
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default EditorSidebar;
