/**
 * @file MietenPage.tsx
 * @purpose Rental information page for vendors interested in leasing sales space
 * @created 2024-01-01
 * @modified 2025-08-05
 */

import React from 'react';

/**
 * Rental information page component
 * @description Displays information about renting sales space for direct marketers
 * @returns {JSX.Element} Rental information page with contact details
 */
const MietenPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-secondary my-6 text-center">Verkaufsfläche mieten</h1>
      <div className="bg-white shadow-lg rounded-lg p-6">
        <p className="text-gray-700 mb-4">
          Sie sind Direktvermarkter und möchten Ihre Produkte in unserem Laden anbieten?
          Wir bieten flexible Mietmodelle und faire Konditionen.
        </p>
        <p className="text-gray-700 mb-4">
          Kontaktieren Sie uns für weitere Informationen und ein individuelles Angebot.
        </p>
        {/* Formular oder Kontaktinformationen hier einfügen, ähnlich wie KontaktPage */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-primary mb-2">Kontaktieren Sie uns:</h2>
          <p className="text-gray-700">Eva-Maria Schaller</p>
          <p className="text-gray-700">Telefon: 0152 22035788</p>
          <p className="text-gray-700">E-Mail: <a href="mailto:eva-maria.schaller@housnkuh.de" className="text-primary hover:underline">eva-maria.schaller@housnkuh.de</a></p>
        </div>
      </div>
    </div>
  );
};

export default MietenPage;