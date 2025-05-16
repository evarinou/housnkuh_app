import React from 'react';
import VendorContest from '../components/VendorContest';

const VendorsPage: React.FC = () => {
  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Die Direktvermarkter</h2>
        
        {/* Informationsbox mit Animation */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-12 transform transition-all duration-300 hover:shadow-lg">
          <h3 className="text-2xl font-semibold text-[var(--secondary)] mb-4">Wer kommt zu housnkuh?</h3>
          <p className="text-gray-600 mb-4">
            Die Housnkuh ist gerade dabei, ein vielfältiges Netzwerk regionaler Direktvermarkter aufzubauen. 
            Ab Sommer 2025 werden Sie hier eine große Auswahl an Anbietern finden, die ihre hochwertigen 
            Produkte in unserem Marktplatz präsentieren.
          </p>
          <p className="text-gray-600">
            Haben Sie einen Favoriten aus der Region, den Sie gerne bei uns sehen würden? 
            Nehmen Sie an unserem Wettbewerb teil und erraten Sie, welche Direktvermarkter bei 
            unserer Eröffnung dabei sein werden!
          </p>
        </div>
        
        {/* Wettbewerbskomponente einfügen */}
        <VendorContest />
      </div>
    </div>
  );
};

export default VendorsPage;