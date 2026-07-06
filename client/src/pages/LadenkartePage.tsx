/**
 * @file LadenkartePage.tsx
 * @purpose Public interactive 3D store map: which Direktvermarkter is in which Mietfach
 * @created 2026-06-11
 */

import React, { Suspense, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Map } from 'lucide-react';
import { useStoreMapData } from '../components/storemap/useStoreMapData';
import MietfachInfoPanel from '../components/storemap/MietfachInfoPanel';
import MapLegend from '../components/storemap/MapLegend';
import { StoreMapMietfach } from '../components/storemap/types';

// three.js bewusst lazy: eigener Chunk, lädt erst beim Besuch dieser Seite
const StoreMap3D = React.lazy(() => import('../components/storemap/StoreMap3D'));

const MapLoading: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

/** Fängt WebGL-/Renderfehler ab, damit die Seite nicht komplett bricht */
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full text-center px-6">
          <p className="text-gray-600">
            Die 3D-Ansicht wird von deinem Browser leider nicht unterstützt.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const LadenkartePage: React.FC = () => {
  const { mietfaecher, loading, error } = useStoreMapData();
  const [selected, setSelected] = useState<StoreMapMietfach | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary flex items-center gap-3">
          <Map className="w-8 h-8 text-primary" />
          Unsere Ladenkarte
        </h1>
        <p className="text-gray-600 mt-2">
          So findest du dich im Laden zurecht: Klicke auf ein Regal, um zu sehen, welcher
          Direktvermarkter dort seine Produkte anbietet. Mit der Maus oder dem Finger kannst du
          die Ansicht drehen und zoomen.
        </p>
      </div>

      <div className="relative">
        <div className="h-[45vh] md:h-[60vh] rounded-2xl overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-200">
          {loading && <MapLoading />}
          {!loading && error && (
            <div className="flex items-center justify-center h-full text-gray-600">{error}</div>
          )}
          {!loading && !error && mietfaecher.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-600 px-6 text-center">
              Die Ladenkarte wird gerade eingerichtet – schau bald wieder vorbei!
            </div>
          )}
          {!loading && !error && mietfaecher.length > 0 && (
            <MapErrorBoundary>
              <Suspense fallback={<MapLoading />}>
                <StoreMap3D
                  mietfaecher={mietfaecher}
                  selectedId={selected?.id}
                  onSelect={setSelected}
                />
              </Suspense>
            </MapErrorBoundary>
          )}
        </div>

        {/* Info-Panel über der Karte (Desktop rechts, Mobil unten) */}
        <AnimatePresence>
          {selected && (
            <div className="md:absolute md:top-4 md:right-4 mt-4 md:mt-0 md:w-80">
              <MietfachInfoPanel mietfach={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5">
        <MapLegend />
      </div>
    </div>
  );
};

export default LadenkartePage;
