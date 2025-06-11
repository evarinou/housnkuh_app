// client/src/components/SimpleMapComponent.tsx
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface MarkerData {
  position: {
    lat: number;
    lng: number;
  };
  title: string;
  description?: string;
  id?: string;
}

interface SimpleMapComponentProps {
  center?: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  markers?: MarkerData[];
  markerPosition?: {
    lat: number;
    lng: number;
  };
  markerTitle?: string;
  className?: string;
  onMarkerClick?: (marker: MarkerData) => void;
  showPopups?: boolean;
  selectedMarkerId?: string;
  fitBounds?: boolean;
}

// Component to handle map view changes
const MapViewController: React.FC<{
  center: { lat: number; lng: number };
  zoom: number;
  markers: MarkerData[];
  selectedMarkerId?: string;
  fitBounds?: boolean;
}> = ({ center, zoom, markers, selectedMarkerId, fitBounds }) => {
  const map = useMap();

  useEffect(() => {
    if (fitBounds && markers.length > 1) {
      // Fit map to show all markers
      const bounds = L.latLngBounds(markers.map(m => [m.position.lat, m.position.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (selectedMarkerId) {
      // Zoom to selected marker
      const selectedMarker = markers.find(m => m.id === selectedMarkerId);
      if (selectedMarker) {
        map.setView([selectedMarker.position.lat, selectedMarker.position.lng], 15, {
          animate: true
        });
      }
    } else {
      // Use provided center and zoom
      map.setView([center.lat, center.lng], zoom, {
        animate: true
      });
    }
  }, [map, center, zoom, markers, selectedMarkerId, fitBounds]);

  return null;
};

/**
 * Eine interaktive Karten-Komponente mit react-leaflet und OpenStreetMap
 * Unterstützt einzelne und mehrere Marker mit Popup-Funktionalität
 */
const SimpleMapComponent: React.FC<SimpleMapComponentProps> = ({
  center = { lat: 50.241120, lng: 11.327709 },
  zoom = 16,
  markers,
  markerPosition = { lat: 50.241120, lng: 11.327709 },
  markerTitle = "housnkuh",
  className = "",
  onMarkerClick,
  showPopups = true,
  selectedMarkerId,
  fitBounds = false
}) => {
  // Create markers array from props
  const markersToRender = markers || [
    {
      position: markerPosition,
      title: markerTitle,
      description: "Strauer Str. 15, 96317 Kronach",
      id: "default"
    }
  ];

  // URL für den "Größere Karte anzeigen" Link
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lng}#map=${zoom}/${center.lat}/${center.lng}`;

  return (
    <div className={`w-full h-full rounded-lg overflow-hidden shadow-lg relative ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapViewController
          center={center}
          zoom={zoom}
          markers={markersToRender}
          selectedMarkerId={selectedMarkerId}
          fitBounds={fitBounds}
        />
        
        {markersToRender.map((marker, index) => (
          <Marker
            key={marker.id || index}
            position={[marker.position.lat, marker.position.lng]}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(marker)
            }}
          >
            {showPopups && (
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold text-gray-900 mb-1">{marker.title}</h3>
                  {marker.description && (
                    <p className="text-gray-600">{marker.description}</p>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
      
      {/* Info overlay - only show for single marker */}
      {markersToRender.length === 1 && (
        <div className="absolute top-0 right-0 bg-white/90 backdrop-blur-sm rounded-bl-lg p-3 shadow-md max-w-xs z-10">
          <div className="flex items-start">
            <MapPin className="w-5 h-5 text-primary mr-2 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-secondary">{markersToRender[0].title}</h3>
              {markersToRender[0].description && (
                <p className="text-xs text-gray-700">{markersToRender[0].description}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Link zum größeren Kartenausschnitt */}
      <div className="absolute bottom-0 left-0 right-0 p-2 text-center text-xs bg-white/80 backdrop-blur-sm z-10">
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