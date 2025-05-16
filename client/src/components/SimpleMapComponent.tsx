// client/src/components/SimpleMapComponent.tsx
import React from 'react';
import { MapPin } from 'lucide-react';

/**
 * Eine einfache Karten-Komponente mit OpenStreetMap-Einbettung
 * Diese Komponente benötigt keine externen Abhängigkeiten
 */
const SimpleMapComponent: React.FC = () => {
  return (
    <div className="w-full h-96 rounded-lg overflow-hidden shadow-lg relative">
      {/* Der eingebettete iframe von OpenStreetMap */}
      <iframe 
        src="https://www.openstreetmap.org/export/embed.html?bbox=11.323390%2C50.238980%2C11.332028%2C50.243260&amp;layer=mapnik&amp;marker=50.241120%2C11.327709" 
        style={{ width: '100%', height: '100%', border: 0 }}
        allowFullScreen
        aria-hidden="false"
        title="Standort Karte"
      ></iframe>
      
      {/* Overlay mit unseren eigenen Infos */}
      <div className="absolute top-0 right-0 bg-white/90 backdrop-blur-sm rounded-bl-lg p-3 shadow-md max-w-xs">
        <div className="flex items-start">
          <MapPin className="w-5 h-5 text-primary mr-2 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-sm text-secondary">housnkuh</h3>
            <p className="text-xs text-gray-700">Strauer Str. 15, 96317 Kronach</p>
          </div>
        </div>
      </div>
      
      {/* Link zum größeren Kartenausschnitt */}
      <div className="absolute bottom-0 left-0 right-0 p-2 text-center text-xs bg-white/80 backdrop-blur-sm">
        <a 
          href="https://www.openstreetmap.org/?mlat=50.241120&mlon=11.327709#map=17/50.241120/11.327709" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Größere Karte anzeigen
        </a>
      </div>
    </div>
  );
};

export default SimpleMapComponent;