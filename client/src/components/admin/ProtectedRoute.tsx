/**
 * @file ProtectedRoute.tsx
 * @purpose Authentication guard component for protecting admin routes with role-based access control
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';

/**
 * Props for the ProtectedRoute component
 * @interface ProtectedRouteProps
 */
interface ProtectedRouteProps {
  /** Whether admin privileges are required for access (default: true) */
  requireAdmin?: boolean;
}

/**
 * Route protection component with authentication and authorization checks
 * 
 * Provides multi-layer security for admin routes:
 * - Authentication verification (logged in user)
 * - Loading state handling during auth checks
 * - Role-based access control (admin privileges)
 * - Automatic redirection for unauthorized access
 * - Integration with AdminLayout for authenticated users
 * 
 * @param {ProtectedRouteProps} props - Component props
 * @param {boolean} [props.requireAdmin=true] - Whether admin role is required
 * @returns {JSX.Element} Either protected content, loading spinner, or redirect
 * 
 * @complexity O(1) - Simple conditional rendering based on auth state
 */
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