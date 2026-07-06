/**
 * @file StoreShell.tsx
 * @purpose Static store geometry for the 3D map: floor, walls and door marking
 * @created 2026-06-11
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  FLOOR_POLYGON,
  WALL_HEIGHT,
  WALL_THICKNESS,
  DOOR,
  FLOOR_COLOR,
  WALL_COLOR,
  HIGHLIGHT_COLOR
} from './storeLayout';

const StoreShell: React.FC = () => {
  const floorShape = useMemo(() => {
    const shape = new THREE.Shape();
    FLOOR_POLYGON.forEach(([x, y], index) => {
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    return shape;
  }, []);

  // Eine Wand pro Grundriss-Kante: Box mit Kantenlänge, mittig auf der Kante
  const walls = useMemo(() => {
    return FLOOR_POLYGON.map((p1, index) => {
      const p2 = FLOOR_POLYGON[(index + 1) % FLOOR_POLYGON.length];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const length = Math.sqrt(dx * dx + dy * dy);
      return {
        key: `wall-${index}`,
        length,
        mid: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2] as [number, number],
        angle: Math.atan2(dy, dx)
      };
    });
  }, []);

  const door = useMemo(() => {
    const dx = DOOR.to[0] - DOOR.from[0];
    const dy = DOOR.to[1] - DOOR.from[1];
    return {
      length: Math.sqrt(dx * dx + dy * dy),
      mid: [(DOOR.from[0] + DOOR.to[0]) / 2, (DOOR.from[1] + DOOR.to[1]) / 2] as [number, number],
      angle: Math.atan2(dy, dx)
    };
  }, []);

  return (
    <group>
      {/* Boden: 2D-Polygon flach auf die XZ-Ebene gelegt (2D-y → 3D-z) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow={false}>
        <shapeGeometry args={[floorShape]} />
        <meshStandardMaterial color={FLOOR_COLOR} side={THREE.DoubleSide} />
      </mesh>

      {walls.map((wall) => (
        <mesh
          key={wall.key}
          position={[wall.mid[0], WALL_HEIGHT / 2, wall.mid[1]]}
          rotation={[0, -wall.angle, 0]}
        >
          <boxGeometry args={[wall.length, WALL_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={WALL_COLOR} transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Türöffnung als flache Bodenmarkierung in der Markenfarbe */}
      <mesh position={[door.mid[0], 0.02, door.mid[1]]} rotation={[0, -door.angle, 0]}>
        <boxGeometry args={[door.length, 0.02, 0.4]} />
        <meshStandardMaterial color={HIGHLIGHT_COLOR} />
      </mesh>
    </group>
  );
};

export default StoreShell;
