// client/src/pages/StandortPage.tsx
import React from 'react';

const StandortPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-secondary my-6 text-center">Unser Standort</h1>
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-semibold text-primary mb-2">Adresse</h2>
        <p className="text-gray-700">Strauer Str. 15</p>
        <p className="text-gray-700">96317 Kronach</p>
        <p className="text-sm text-gray-600 mt-1">Hinweis: Der Laden ist über eine Treppe erreichbar.</p>

        <h2 className="text-xl font-semibold text-primary mt-6 mb-2">Öffnungszeiten</h2>
        <p className="text-gray-700">Erweiterte Öffnungszeiten, 7 Tage die Woche.</p>
        <p className="text-gray-700">Zugang mit EC- oder Kreditkarte.</p>

        <h2 className="text-xl font-semibold text-primary mt-6 mb-2">Kontakt</h2>
        <p className="text-gray-700">Telefon: 0157 35711257</p>
        <p className="text-gray-700">E-Mail: eva-maria.schaller@housnkuh.de</p>

        <div className="mt-6">
          {/* Hier könnte eine Karte eingebettet werden (z.B. Google Maps oder OpenStreetMap via Leaflet) */}
          <div className="bg-gray-200 h-64 rounded flex items-center justify-center">
            <p className="text-gray-500">Kartenplatzhalter</p>
          </div>
        </div>
         <h2 className="text-xl font-semibold text-primary mt-6 mb-2">Parkmöglichkeiten</h2>
        <ul className="list-disc list-inside text-gray-700">
            <li>Direkt vor dem Laden (evangelische Kirche)</li>
            <li>Andreas Limmer Straße (50m entfernt)</li>
            <li>Entlang der Strauer Straße</li>
            <li>Entlang der Friesener Straße</li>
        </ul>
      </div>
    </div>
  );
};

export default StandortPage;