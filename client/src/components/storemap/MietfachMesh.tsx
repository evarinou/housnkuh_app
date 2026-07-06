/**
 * @file MietfachMesh.tsx
 * @purpose Single clickable Mietfach box in the 3D scene with hover tooltip
 * @created 2026-06-11
 */

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { StoreMapMietfach } from './types';
import { TYP_COLORS, SELECTED_EMISSIVE } from './storeLayout';

interface MietfachMeshProps {
  mietfach: StoreMapMietfach;
  selected: boolean;
  /** Embed-Modus: dieses Fach gehört dem hervorgehobenen Vendor */
  highlighted?: boolean;
  /** Embed-Modus: ein anderer Vendor ist hervorgehoben → dieses Fach dimmen */
  dimmed?: boolean;
  /** Pulsieren nur sinnvoll bei frameloop="always" (Embed) */
  pulse?: boolean;
  onSelect?: (mietfach: StoreMapMietfach) => void;
}

const MietfachMesh: React.FC<MietfachMeshProps> = ({
  mietfach,
  selected,
  highlighted = false,
  dimmed = false,
  pulse = false,
  onSelect
}) => {
  const [hovered, setHovered] = useState(false);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const { position } = mietfach;

  const colors = TYP_COLORS[mietfach.typ] || TYP_COLORS.sonstiges;
  const baseColor = mietfach.belegt ? colors.belegt : colors.frei;
  const active = hovered || selected || highlighted;

  // Drehung um die Fach-Mitte; 2D-Rotation (y nach unten) → -Drehung um die 3D-Hochachse
  const centerX = position.x + position.w / 2;
  const centerZ = position.y + position.d / 2;
  const rotationY = -THREE.MathUtils.degToRad(position.rotation);

  useFrame(({ clock }) => {
    if (pulse && highlighted && materialRef.current) {
      const intensity = 0.25 + 0.2 * Math.sin(clock.elapsedTime * 3);
      materialRef.current.emissiveIntensity = intensity;
    }
  });

  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, rotationY, 0]}>
      <mesh
        position={[0, position.h / 2, 0]}
        scale={active ? 1.02 : 1}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect?.(mietfach);
        }}
      >
        <boxGeometry args={[position.w, position.h, position.d]} />
        <meshStandardMaterial
          ref={materialRef}
          color={baseColor}
          emissive={active ? SELECTED_EMISSIVE : '#000000'}
          emissiveIntensity={active ? 0.25 : 0}
          transparent={dimmed}
          opacity={dimmed ? 0.25 : 1}
        />
      </mesh>

      {hovered && (
        <Html
          position={[0, position.h + 0.3, 0]}
          center
          style={{ pointerEvents: 'none' }}
          zIndexRange={[100, 0]}
        >
          <div className="bg-secondary text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
            <span className="font-semibold">{mietfach.bezeichnung}</span>
            {' – '}
            {mietfach.belegt
              ? mietfach.vendor
                ? mietfach.vendor.unternehmen || mietfach.vendor.name
                : 'Belegt'
              : 'Frei'}
          </div>
        </Html>
      )}
    </group>
  );
};

export default MietfachMesh;
