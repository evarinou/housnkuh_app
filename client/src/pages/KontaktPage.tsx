/**
 * @file KontaktPage.tsx
 * @purpose Contact page displaying contact form, business information, and location map
 * @created 2024-01-01
 * @modified 2025-08-05
 */

import React from 'react';
import ContactForm from '../components/ContactForm';
import SimpleMapComponent from '../components/SimpleMapComponent';

/**
 * Contact page component for Housnkuh marketplace
 * @description Displays contact form, business information, opening hours, and interactive map
 * @returns {JSX.Element} Complete contact page with form and business details
 */
const KontaktPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 pb-12">
      <h1 className="text-3xl font-bold text-primary-900 my-6 text-center">Kontaktieren Sie Eva-Maria Schaller</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Linke Seite - Kontaktformular */}
        <div>
          <ContactForm className="h-full" />
        </div>
        
        {/* Rechte Seite - Kontaktinformationen und Karte */}
        <div className="flex flex-col">
          <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-primary-900 mb-4">Kontaktdaten</h2>
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-primary-800 mb-2">Adresse:</h3>
              <p className="text-gray-700">housnkuh - Regionaler Marktplatz</p>
              <p className="text-gray-700">Strauer Str. 15</p>
              <p className="text-gray-700">96317 Kronach</p>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-primary-800 mb-2">Telefon:</h3>
              <p className="text-gray-700">
                <a href="tel:015222035788" className="hover:text-primary-600 transition duration-300">0152 22035788</a>
              </p>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-primary-800 mb-2">E-Mail:</h3>
              <p className="text-gray-700">
                <a href="mailto:eva-maria.schaller@housnkuh.de" className="text-primary-600 hover:underline transition duration-300">
                  eva-maria.schaller@housnkuh.de
                </a>
              </p>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-primary-800 mb-2">Öffnungszeiten:</h3>
              <p className="text-gray-700">Montag - Freitag: 9:00 - 18:00 Uhr</p>
              <p className="text-gray-700">Samstag: 9:00 - 13:00 Uhr</p>
            </div>
          </div>
          
          {/* Karte - Verwenden der SimpleMapComponent, falls vorhanden */}
          <div className="bg-white shadow-lg rounded-lg p-6 h-[300px]">
            <SimpleMapComponent 
              center={{ lat: 50.244722, lng: 11.325833 }} 
              zoom={14} 
              markerPosition={{ lat: 50.244722, lng: 11.325833 }}
              markerTitle="housnkuh - Regionaler Marktplatz"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default KontaktPage;