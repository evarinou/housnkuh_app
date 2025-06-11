// client/src/components/VendorListPreview.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, ArrowRight } from 'lucide-react';

interface VendorListPreviewProps {
  title?: string;
  description?: string;
  showRegistrationLink?: boolean;
  className?: string;
}

const VendorListPreview: React.FC<VendorListPreviewProps> = ({
  title = "Direktvermarkter kommen bald",
  description = "Die housnkuh-Plattform wird gerade aufgebaut. Lokale Direktvermarkter können sich bereits registrieren und werden nach der Eröffnung für Kunden sichtbar.",
  showRegistrationLink = true,
  className = ""
}) => {
  return (
    <div className={`bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-8 text-center ${className}`}>
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary/10 rounded-full">
            <Store className="h-12 w-12 text-primary" />
          </div>
        </div>
        
        {/* Content */}
        <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{description}</p>
        
        {/* Additional info */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <div className="flex items-center justify-center text-primary mb-2">
            <Users className="h-5 w-5 mr-2" />
            <span className="font-medium">Für Direktvermarkter</span>
          </div>
          <p className="text-sm text-gray-600">
            Registrieren Sie sich bereits jetzt und seien Sie von Beginn an dabei!
          </p>
        </div>
        
        {/* Action buttons */}
        {showRegistrationLink && (
          <div className="space-y-3">
            <Link 
              to="/vendor/login" 
              className="inline-flex items-center justify-center w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors"
            >
              Als Direktvermarkter registrieren
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              to="/pricing" 
              className="inline-flex items-center justify-center w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Mehr über Mietfächer erfahren
            </Link>
          </div>
        )}
        
        {/* Newsletter suggestion */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">
            Möchten Sie informiert bleiben?
          </p>
          <Link 
            to="/#newsletter" 
            className="text-primary hover:underline font-medium text-sm"
          >
            Newsletter abonnieren
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorListPreview;