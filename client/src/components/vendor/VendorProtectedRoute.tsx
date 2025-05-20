// client/src/components/vendor/VendorProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

// Komponente für geschützten Vendor-Bereich
const VendorProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useVendorAuth();

  // Wenn noch geladen wird, zeigen wir einen Ladeindikator an
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Authentifizierung wird überprüft...</span>
      </div>
    );
  }

  // Wenn nicht authentifiziert, Weiterleitung zum Login
  if (!isAuthenticated) {
    return <Navigate to="/vendor/login" replace />;
  }

  // Wenn authentifiziert, gebe Zugriff auf die geschützten Routen
  return <Outlet />;
};

export default VendorProtectedRoute;