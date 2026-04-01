/**
 * @file CreateTagInline.tsx
 * @purpose Reusable inline tag creation component — Name, Icon, Color + Preview
 * @created 2026-04-01
 */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import TagBadge from './TagBadge';

export interface CreateTagInlineProps {
  onCreateTag: (name: string, icon?: string, color?: string) => Promise<any>;
  disabled?: boolean;
}

const CreateTagInline: React.FC<CreateTagInlineProps> = ({ onCreateTag, disabled }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      await onCreateTag(name.trim(), icon.trim() || undefined, color || undefined);
      setName('');
      setIcon('');
      setColor('#6B7280');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
          placeholder="Neuer Tag Name..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
          disabled={disabled || creating}
        />
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="Icon"
          className="w-14 px-2 py-1.5 text-sm border border-gray-300 rounded-md text-center"
          disabled={disabled || creating}
          maxLength={2}
          title="Emoji Icon (optional)"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
          disabled={disabled || creating}
          title="Farbe"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !name.trim() || disabled}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          {creating ? '...' : 'Erstellen'}
        </button>
      </div>
      {name.trim() && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Vorschau:</span>
          <TagBadge name={name.trim()} icon={icon || undefined} color={color} size="md" />
        </div>
      )}
    </div>
  );
};

export default CreateTagInline;
