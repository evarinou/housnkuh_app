/**
 * @file StoreMapEditor.tsx
 * @purpose SVG canvas of the 2D store map editor: floor, grid, draggable Mietfach rects.
 *          Coordinate system = meters (1 SVG unit = 1 m), native pointer events, no DnD lib.
 * @created 2026-06-11
 */

import React, { useMemo, useRef } from 'react';
import { MietfachPosition } from '../../storemap/types';
import { FLOOR_POLYGON, DOOR, FLOOR_COLOR, HIGHLIGHT_COLOR } from '../../storemap/storeLayout';
import { snapToGrid, clampToFloor, getFloorBounds } from './storeMapEditorUtils';
import EditorItem, { EditorItemData } from './EditorItem';

interface StoreMapEditorProps {
  items: EditorItemData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangePosition: (id: string, position: MietfachPosition) => void;
  /** Optionales Underlay (Top-Down-Render des 3D-Scans) zum Abpausen */
  underlayUrl?: string | null;
  underlayOpacity?: number;
}

type DragState =
  | { mode: 'move'; id: string; offsetX: number; offsetY: number }
  | { mode: 'resize'; id: string }
  | null;

const PADDING = 1; // Meter Rand um den Grundriss

const StoreMapEditor: React.FC<StoreMapEditorProps> = ({
  items,
  selectedId,
  onSelect,
  onChangePosition,
  underlayUrl = null,
  underlayOpacity = 0.4
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState>(null);
  const bounds = useMemo(() => getFloorBounds(), []);

  const viewBox = `${bounds.minX - PADDING} ${bounds.minY - PADDING} ${
    bounds.maxX - bounds.minX + 2 * PADDING
  } ${bounds.maxY - bounds.minY + 2 * PADDING}`;

  const gridLines = useMemo(() => {
    const lines: Array<{ key: string; x1: number; y1: number; x2: number; y2: number; major: boolean }> = [];
    for (let x = Math.ceil(bounds.minX * 2) / 2; x <= bounds.maxX; x += 0.5) {
      lines.push({ key: `v${x}`, x1: x, y1: bounds.minY, x2: x, y2: bounds.maxY, major: x % 1 === 0 });
    }
    for (let y = Math.ceil(bounds.minY * 2) / 2; y <= bounds.maxY; y += 0.5) {
      lines.push({ key: `h${y}`, x1: bounds.minX, y1: y, x2: bounds.maxX, y2: y, major: y % 1 === 0 });
    }
    return lines;
  }, [bounds]);

  /** Pointer-Event → SVG-Koordinaten (Meter) */
  const svgPoint = (event: React.PointerEvent): { x: number; y: number } => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  };

  const findItem = (id: string) => items.find((item) => item.id === id);

  const handlePointerDownBody = (event: React.PointerEvent, id: string) => {
    event.stopPropagation();
    const item = findItem(id);
    if (!item) return;
    onSelect(id);
    const { x, y } = svgPoint(event);
    dragRef.current = { mode: 'move', id, offsetX: x - item.position.x, offsetY: y - item.position.y };
    (event.target as Element).setPointerCapture(event.pointerId);
  };

  const handlePointerDownResize = (event: React.PointerEvent, id: string) => {
    event.stopPropagation();
    dragRef.current = { mode: 'resize', id };
    (event.target as Element).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const item = findItem(drag.id);
    if (!item) return;
    const { x, y } = svgPoint(event);

    if (drag.mode === 'move') {
      onChangePosition(
        drag.id,
        clampToFloor(
          {
            ...item.position,
            x: snapToGrid(x - drag.offsetX),
            y: snapToGrid(y - drag.offsetY)
          },
          bounds
        )
      );
    } else {
      // Resize über die Ecke unten rechts (im unrotierten Koordinatensystem)
      onChangePosition(
        drag.id,
        clampToFloor(
          {
            ...item.position,
            w: Math.max(0.2, snapToGrid(x - item.position.x)),
            d: Math.max(0.2, snapToGrid(y - item.position.y))
          },
          bounds
        )
      );
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className="w-full h-full touch-none select-none bg-gray-50 rounded-lg border border-gray-200"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerDown={() => onSelect(null)}
    >
      {/* Boden */}
      <polygon
        points={FLOOR_POLYGON.map((p) => p.join(',')).join(' ')}
        fill={FLOOR_COLOR}
        stroke="#09122c"
        strokeWidth={0.05}
      />

      {/* Underlay: Scan-Render zum Abpausen */}
      {underlayUrl && (
        <image
          href={underlayUrl}
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxY - bounds.minY}
          opacity={underlayOpacity}
          preserveAspectRatio="xMidYMid meet"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Raster: 0,5 m fein, 1 m kräftiger */}
      {gridLines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#09122c"
          strokeWidth={line.major ? 0.015 : 0.007}
          opacity={0.25}
        />
      ))}

      {/* Türmarkierung */}
      <line
        x1={DOOR.from[0]}
        y1={DOOR.from[1]}
        x2={DOOR.to[0]}
        y2={DOOR.to[1]}
        stroke={HIGHLIGHT_COLOR}
        strokeWidth={0.12}
      />

      {items.map((item) => (
        <EditorItem
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onPointerDownBody={handlePointerDownBody}
          onPointerDownResize={handlePointerDownResize}
        />
      ))}
    </svg>
  );
};

export default StoreMapEditor;
