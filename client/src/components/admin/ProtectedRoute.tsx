// client/src/components/admin/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requireAdmin = true }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Während der Authentifizierungsprüfung anzeigen
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Wenn nicht authentifiziert, zum Login umleiten
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Bei Admin-Anforderung prüfen, ob Benutzer Admin ist
  if (requireAdmin && !user?.isAdmin) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  // Wenn authentifiziert, die geschützten Routen anzeigen
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
};

export default ProtectedRoute;