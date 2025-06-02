// client/src/components/SimpleMapComponent.tsx
import React from 'react';
import { MapPin } from 'lucide-react';

interface SimpleMapComponentProps {
  center?: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  markerPosition?: {
    lat: number;
    lng: number;
  };
  markerTitle?: string;
  className?: string;
}

/**
 * Eine einfache Karten-Komponente mit OpenStreetMap-Einbettung
 * Diese Komponente benötigt keine externen Abhängigkeiten
 */
const SimpleMapComponent: React.FC<SimpleMapComponentProps> = ({
  center = { lat: 50.241120, lng: 11.327709 },
  zoom = 16,
  markerPosition = { lat: 50.241120, lng: 11.327709 },
  markerTitle = "housnkuh",
  className = ""
}) => {
  // Berechnen der bounding box (bbox) für die Karte
  // Dies ist eine einfache Annäherung, die von der Zoomstufe abhängt
  const getMapBoundingBox = () => {
    const zoomFactor = 0.01 / (zoom * 0.15); // Einfacher Faktor, um die Größe der bbox zu bestimmen
    const minLng = center.lng - zoomFactor;
    const minLat = center.lat - zoomFactor;
    const maxLng = center.lng + zoomFactor;
    const maxLat = center.lat + zoomFactor;
    
    return `${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}`;
  };
  
  // Iframe-URL generieren
  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${getMapBoundingBox()}&amp;layer=mapnik&amp;marker=${markerPosition.lat}%2C${markerPosition.lng}`;
  
  // URL für den "Größere Karte anzeigen" Link
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${markerPosition.lat}&mlon=${markerPosition.lng}#map=${zoom}/${center.lat}/${center.lng}`;
  
  return (
    <div className={`w-full h-full rounded-lg overflow-hidden shadow-lg relative ${className}`}>
      {/* Der eingebettete iframe von OpenStreetMap */}
      <iframe 
        src={iframeSrc}
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
            <h3 className="font-semibold text-sm text-secondary">{markerTitle}</h3>
            <p className="text-xs text-gray-700">Strauer Str. 15, 96317 Kronach</p>
          </div>
        </div>
      </div>
      
      {/* Link zum größeren Kartenausschnitt */}
      <div className="absolute bottom-0 left-0 right-0 p-2 text-center text-xs bg-white/80 backdrop-blur-sm">
        <a 
          href={fullMapUrl}
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