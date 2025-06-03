// client/src/pages/StandortPage.tsx
import React from 'react';
import { MapPin, Clock, Phone, Mail, Car, Bus } from 'lucide-react';
//import SimpleMapComponent from '../components/SimpleMapComponent';

// Hilfsfunktion für Standortmerkmale (Adresse, Öffnungszeiten usw.)
interface LocationFeatureProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

const LocationFeature: React.FC<LocationFeatureProps> = ({ icon: Icon, title, children }) => (
  <div className="flex items-start">
    <Icon className="w-6 h-6 text-primary mr-3 mt-1 flex-shrink-0" />
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </div>
  </div>
);

// Komponente für einzelne Parkplatz-Einträge
interface ParkingSpotProps {
  location: string;
}

const ParkingSpot: React.FC<ParkingSpotProps> = ({ location }) => (
  <li className="flex items-center space-x-2">
    <span className="w-2 h-2 bg-primary rounded-full" />
    <span className="text-gray-600">{location}</span>
  </li>
);

// Komponente für den Geschichtsabschnitt
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

// Haupt-Komponente für die Standort-Seite
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
          <iframe 
            src="https://www.openstreetmap.org/export/embed.html?bbox=11.323390%2C50.238980%2C11.332028%2C50.243260&amp;layer=mapnik&amp;marker=50.241120%2C11.327709" 
            style={{ width: '100%', height: '100%', border: 0 }}
            allowFullScreen
            aria-hidden="false"
            title="Standort Karte"
          ></iframe>
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
              <p className="text-gray-600">0157 35711257</p>
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