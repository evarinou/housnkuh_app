// client/src/pages/admin/UnauthorizedPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Home } from 'lucide-react';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="bg-red-50 p-4 rounded-full mb-4">
        <Shield className="h-16 w-16 text-red-600" />
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">Zugriff verweigert</h1>
      
      <p className="text-gray-600 mb-8 text-center max-w-md">
        Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen. Bitte wenden Sie sich an einen Administrator.
      </p>
      
      <div className="space-x-4">
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-secondary text-white rounded-md hover:bg-opacity-90"
        >
          <Home className="h-5 w-5 mr-2" />
          Zur Startseite
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;