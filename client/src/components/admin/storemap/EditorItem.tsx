/**
 * @file EditorItem.tsx
 * @purpose Single draggable Mietfach rect in the 2D editor SVG (drag body, resize corner)
 * @created 2026-06-11
 */

import React from 'react';
import { MietfachPosition, MietfachTyp } from '../../storemap/types';
import { TYP_COLORS, HIGHLIGHT_COLOR } from '../../storemap/storeLayout';

export interface EditorItemData {
  id: string;
  bezeichnung: string;
  typ: MietfachTyp;
  position: MietfachPosition;
  belegt: boolean;
  vendorName: string | null;
}

interface EditorItemProps {
  item: EditorItemData;
  selected: boolean;
  onPointerDownBody: (event: React.PointerEvent, id: string) => void;
  onPointerDownResize: (event: React.PointerEvent, id: string) => void;
}

const HANDLE_SIZE = 0.3; // Meter (SVG-Einheiten)

const EditorItem: React.FC<EditorItemProps> = ({
  item,
  selected,
  onPointerDownBody,
  onPointerDownResize
}) => {
  const { position } = item;
  const colors = TYP_COLORS[item.typ] || TYP_COLORS.sonstiges;
  const fill = item.belegt ? colors.belegt : colors.frei;
  const centerX = position.x + position.w / 2;
  const centerY = position.y + position.d / 2;

  return (
    <g transform={`rotate(${position.rotation} ${centerX} ${centerY})`}>
      <rect
        x={position.x}
        y={position.y}
        width={position.w}
        height={position.d}
        fill={fill}
        stroke={selected ? HIGHLIGHT_COLOR : '#00000033'}
        strokeWidth={selected ? 0.06 : 0.02}
        rx={0.05}
        style={{ cursor: 'move' }}
        onPointerDown={(event) => onPointerDownBody(event, item.id)}
      />
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.min(0.28, position.d * 0.6)}
        fill="#09122c"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {item.bezeichnung}
      </text>

      {selected && (
        <rect
          x={position.x + position.w - HANDLE_SIZE / 2}
          y={position.y + position.d - HANDLE_SIZE / 2}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill={HIGHLIGHT_COLOR}
          stroke="#fff"
          strokeWidth={0.04}
          style={{ cursor: 'nwse-resize' }}
          onPointerDown={(event) => onPointerDownResize(event, item.id)}
        />
      )}
    </g>
  );
};

export default EditorItem;
