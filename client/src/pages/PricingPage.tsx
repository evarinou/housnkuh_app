/**
 * @file PricingPage.tsx
 * @purpose Pricing information page displaying rental options and package builder for vendors
 * @created 2024-01-01
 * @modified 2025-08-05
 */

import React from 'react';
import { Info } from 'lucide-react';
import PackageBuilder from '../components/PackageBuilder';

/**
 * Pricing page component for vendor sales space rental
 * @description Displays pricing options and interactive package builder for vendors to select rental packages
 * @returns {JSX.Element} Complete pricing page with package builder
 */
const PricingPage: React.FC = () => {
  return (
    <div className="py-12 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[var(--secondary)] mb-4">Verkaufsfläche mieten</h1>
          <p className="text-xl text-gray-600 mb-8">
            Präsentiere deine Produkte dort, wo Kunden sie finden
          </p>
          <div className="inline-flex items-center bg-[var(--primary)]/10 text-[var(--primary)] px-4 py-2 rounded-lg">
            <Info className="w-5 h-5 mr-2" />
            <span>Rabatte: 5% bei 6 Monaten, 10% bei 12 Monaten Laufzeit</span>
          </div>
        </div>

        {/* Hier wird der neue Package Builder eingefügt */}
        <PackageBuilder />
        
        {/* Infobox mit weiteren Details */}
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8 mt-12">
          <h2 className="text-2xl font-bold text-[var(--secondary)] mb-6">Deine Vorteile als housnkuh-Partner</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--primary)] mb-2">Individueller Herstelleraufsteller</h3>
              <p className="text-gray-600">
                Präsentiere deine Geschichte und dein Unternehmen direkt neben deinen Produkten. 
                So schaffst du eine persönliche Verbindung zu deinen Kunden.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[var(--primary)] mb-2">Professionelles Etikettiersystem</h3>
              <p className="text-gray-600">
                Wir sorgen für ein einheitliches, ansprechendes Erscheinungsbild und kümmern uns um 
                die korrekte Preisauszeichnung deiner Produkte.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[var(--primary)] mb-2">Detaillierte Verkaufsstatistiken</h3>
              <p className="text-gray-600">
                Erhalte wertvolle Einblicke in das Kaufverhalten deiner Kunden und optimiere dein 
                Angebot basierend auf echten Verkaufsdaten.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[var(--primary)] mb-2">Gemeinsame Marketingaktionen</h3>
              <p className="text-gray-600">
                Profitiere von unseren regelmäßigen Marketingaktivitäten und speziellen Themenwochen, 
                die deine Produkte ins Rampenlicht stellen.
              </p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-center text-gray-600">
              Du hast noch Fragen? Kontaktiere uns gerne direkt unter <br />
              <a href="tel:015222035788" className="text-[var(--primary)] font-medium">0152 22035788</a> oder 
              <a href="mailto:eva-maria.schaller@housnkuh.de" className="text-[var(--primary)] font-medium"> eva-maria.schaller@housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;