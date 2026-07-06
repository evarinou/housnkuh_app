/**
 * @file StoreMap3D.tsx
 * @purpose 3D store map scene: canvas, camera, lights, shell and Mietfach meshes.
 *          Only entry point that imports three.js — always load via React.lazy.
 * @created 2026-06-11
 */

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import StoreShell from './StoreShell';
import MietfachMesh from './MietfachMesh';
import { StoreMapMietfach } from './types';
import { STORE_CENTER } from './storeLayout';

interface StoreMap3DProps {
  mietfaecher: StoreMapMietfach[];
  selectedId?: string | null;
  onSelect?: (mietfach: StoreMapMietfach | null) => void;
  /** Embed-Modus: Fächer dieses Vendors hervorheben, alle anderen dimmen */
  highlightVendorId?: string;
  /** Embed-Modus: Kamera langsam rotieren lassen (erzwingt frameloop="always") */
  autoRotate?: boolean;
}

/** Kamera-Fokus: Mitte + Abstand aus der Bounding-Box der relevanten Fächer */
function computeFocus(mietfaecher: StoreMapMietfach[]): { target: [number, number, number]; distance: number } {
  if (mietfaecher.length === 0) {
    return { target: [STORE_CENTER[0], 0, STORE_CENTER[1]], distance: 14 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const mf of mietfaecher) {
    minX = Math.min(minX, mf.position.x);
    maxX = Math.max(maxX, mf.position.x + mf.position.w);
    minY = Math.min(minY, mf.position.y);
    maxY = Math.max(maxY, mf.position.y + mf.position.d);
  }
  const spread = Math.max(maxX - minX, maxY - minY);
  return {
    target: [(minX + maxX) / 2, 0, (minY + maxY) / 2],
    distance: Math.max(6, spread * 2.2)
  };
}

const StoreMap3D: React.FC<StoreMap3DProps> = ({
  mietfaecher,
  selectedId = null,
  onSelect,
  highlightVendorId,
  autoRotate = false
}) => {
  const focus = useMemo(() => {
    const relevant = highlightVendorId
      ? mietfaecher.filter((mf) => mf.vendor?.id === highlightVendorId)
      : mietfaecher;
    return computeFocus(relevant.length > 0 ? relevant : mietfaecher);
  }, [mietfaecher, highlightVendorId]);

  const cameraPosition: [number, number, number] = [
    focus.target[0] + focus.distance * 0.55,
    focus.distance * 0.75,
    focus.target[2] + focus.distance * 0.8
  ];

  return (
    <Canvas
      frameloop={autoRotate ? 'always' : 'demand'}
      dpr={[1, 2]}
      camera={{ position: cameraPosition, fov: 45 }}
      onPointerMissed={() => onSelect?.(null)}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 15, 8]} intensity={0.9} />

      <StoreShell />

      {mietfaecher.map((mf) => (
        <MietfachMesh
          key={mf.id}
          mietfach={mf}
          selected={mf.id === selectedId}
          highlighted={!!highlightVendorId && mf.vendor?.id === highlightVendorId}
          dimmed={!!highlightVendorId && mf.vendor?.id !== highlightVendorId}
          pulse={autoRotate}
          onSelect={onSelect}
        />
      ))}

      <OrbitControls
        target={focus.target}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
        enablePan={!autoRotate}
        minDistance={3}
        maxDistance={30}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
      />
    </Canvas>
  );
};

export default StoreMap3D;
