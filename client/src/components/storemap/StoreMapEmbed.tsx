/**
 * @file StoreMapEmbed.tsx
 * @purpose Mini 3D store map for the vendor detail page: highlights the vendor's Mietfächer.
 *          Renders nothing if the vendor has no positioned Mietfächer; the three.js chunk
 *          only loads once the section scrolls into the viewport.
 * @created 2026-06-11
 */

import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { Map } from 'lucide-react';
import { useStoreMapData, filterByVendor } from './useStoreMapData';

const StoreMap3D = React.lazy(() => import('./StoreMap3D'));

interface StoreMapEmbedProps {
  vendorId: string;
}

const StoreMapEmbed: React.FC<StoreMapEmbedProps> = ({ vendorId }) => {
  const { mietfaecher, loading, error } = useStoreMapData();
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '200px' });

  const vendorFaecher = filterByVendor(mietfaecher, vendorId);

  // Kein Abschnitt (und kein three.js-Download), wenn der Vendor nicht auf der Karte ist
  if (loading || error || vendorFaecher.length === 0) {
    return null;
  }

  const fachListe = vendorFaecher.map((mf) => mf.bezeichnung).join(', ');

  return (
    <div ref={ref} className="mt-8 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-secondary mb-1 flex items-center gap-2">
        <Map className="w-5 h-5 text-primary" />
        Hier findest du uns im Laden
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        {vendorFaecher.length === 1 ? 'Fach' : 'Fächer'}: {fachListe}
      </p>

      <div className="h-64 md:h-80 rounded-xl overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-200">
        {inView && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            }
          >
            <StoreMap3D mietfaecher={mietfaecher} highlightVendorId={vendorId} autoRotate />
          </Suspense>
        )}
      </div>

      <Link
        to="/ladenkarte"
        className="inline-block mt-3 text-sm text-primary font-medium hover:underline"
      >
        Ganze Ladenkarte ansehen →
      </Link>
    </div>
  );
};

export default StoreMapEmbed;
