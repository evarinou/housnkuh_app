/**
 * @file StandortPage.tsx
 * @purpose Location information page displaying business location details, opening hours, and contact information
 * @created 2024-01-01
 * @modified 2025-08-05
 */

import React from 'react';
import { MapPin, Clock, Phone, Mail, Car, Bus } from 'lucide-react';
import SimpleMapComponent from '../components/SimpleMapComponent';

/**
 * Props interface for LocationFeature component
 * @interface LocationFeatureProps
 * @property {React.ElementType} icon - Icon component to display
 * @property {string} title - Feature title
 * @property {React.ReactNode} children - Feature content
 */
interface LocationFeatureProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

/**
 * Location feature component displaying an icon, title, and content
 * @description Renders a location-related feature with icon and structured content
 * @param {LocationFeatureProps} props - Component props
 * @returns {JSX.Element} Location feature display
 */
const LocationFeature: React.FC<LocationFeatureProps> = ({ icon: Icon, title, children }) => (
  <div className="flex items-start">
    <Icon className="w-6 h-6 text-primary mr-3 mt-1 flex-shrink-0" />
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </div>
  </div>
);

/**
 * Props interface for ParkingSpot component
 * @interface ParkingSpotProps
 * @property {string} location - Parking location description
 */
interface ParkingSpotProps {
  location: string;
}

/**
 * Individual parking spot list item component
 * @description Renders a parking location with bullet point styling
 * @param {ParkingSpotProps} props - Component props
 * @returns {JSX.Element} Parking spot list item
 */
const ParkingSpot: React.FC<ParkingSpotProps> = ({ location }) => (
  <li className="flex items-center space-x-2">
    <span className="w-2 h-2 bg-primary rounded-full" />
    <span className="text-gray-600">{location}</span>
  </li>
);

/**
 * History section component displaying location historical information
 * @description Shows the historical background of the business location
 * @returns {JSX.Element} History section with location background
 */
const HistorySection: React.FC = () => (
  <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-8 mt-12">
    <h3 className="text-xl font-semibold mb-4">Geschichte des Standorts</h3>
    <p className="text-gray-600 mb-4">
      Die Immobilie in der Strauer Straße 15 blickt auf eine lange Tradition im Einzelhandel zurück. 
      Ursprünglich beherbergte sie die Cammerer-Drogerie und später die Buchhandlung LeseZeichen.
    </p>
    <p className="text-gray-600">
      Ab Sommer 2025 wird sie als neuer Marktplatz für regionale Produkte eine neue Ära einläuten.
    </p>
  </div>
);

/**
 * Main location page component
 * @description Displays comprehensive location information including map, address, opening hours, and parking
 * @returns {JSX.Element} Complete location information page
 */
const StandortPage: React.FC = () => {
  return (
    <div className="py-12 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary mb-4">Der Standort</h1>
          <p className="text-xl text-gray-600">
            Zentral in Kronach – Ihre neue Anlaufstelle für regionale Produkte
          </p>
        </div>
        
        {/* Kartenbereich mit kontrollierter Höhe */}
        <div className="w-full h-64 md:h-80 mb-12 rounded-lg overflow-hidden shadow-lg">
          <SimpleMapComponent
            center={{ lat: 50.241120, lng: 11.327709 }}
            zoom={16}
            markerPosition={{ lat: 50.241120, lng: 11.327709 }}
            markerTitle="housnkuh Standort"
            showPopups={true}
            className="h-full w-full"
          />
        </div>
        
        {/* Info-Bereich unter der Karte */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Adresse und Kontakt */}
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-5">
            <LocationFeature icon={MapPin} title="Adresse">
              <p className="text-gray-600">Strauer Str. 15</p>
              <p className="text-gray-600">96317 Kronach</p>
              <p className="text-sm text-gray-500 mt-2">
                Hinweis: Der Laden ist über eine Treppe erreichbar
              </p>
            </LocationFeature>
            
            <LocationFeature icon={Phone} title="Telefon">
              <p className="text-gray-600">0152 22035788</p>
            </LocationFeature>
            
            <LocationFeature icon={Mail} title="E-Mail">
              <p className="text-gray-600">eva-maria.schaller@housnkuh.de</p>
            </LocationFeature>
          </div>
          
          {/* Öffnungszeiten */}
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-5">
            <LocationFeature icon={Clock} title="Öffnungszeiten">
              <p className="text-gray-600">Erweiterte Öffnungszeiten</p>
              <p className="text-gray-600">7 Tage die Woche</p>
              <p className="text-sm text-gray-500 mt-1">
                Zugang mit EC- oder Kreditkarte
              </p>
            </LocationFeature>
            
            <LocationFeature icon={Bus} title="Öffentliche Verkehrsmittel">
              <p className="text-gray-600">Bushaltestelle "Strauer Straße" direkt vor dem Laden</p>
            </LocationFeature>
          </div>
          
          {/* Parkmöglichkeiten */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <Car className="w-6 h-6 text-primary mr-2" />
              <h3 className="font-semibold">Parkmöglichkeiten</h3>
            </div>
            <ul className="space-y-2">
              <ParkingSpot location="Direkt vor dem Laden (evangelische Kirche)" />
              <ParkingSpot location="Andreas Limmer Straße (50m entfernt)" />
              <ParkingSpot location="Entlang der Strauer Straße" />
              <ParkingSpot location="Entlang der Friesener Straße" />
            </ul>
          </div>
        </div>

        <HistorySection />
        
        {/* Links zur Karte */}
        <div className="text-center mt-8 space-y-3">
          <a 
            href="https://www.openstreetmap.org/?mlat=50.241120&mlon=11.327709#map=17/50.241120/11.327709" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center"
          >
            <MapPin className="w-4 h-4 mr-1" />
            <span>Größere Karte anzeigen</span>
          </a>
          
        </div>
      </div>
    </div>
  );
};

export default StandortPage;