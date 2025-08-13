/**
 * @file VendorLayout.tsx
 * @purpose Layout wrapper component for vendor dashboard providing navigation, authentication state, and trial status display
 * @created 2025-01-15
 * @modified 2025-08-07
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Package, Home, LogOut, Settings, FileText, ShoppingCart, BarChart3, Receipt, Star } from 'lucide-react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

/**
 * Props interface for the VendorLayout component
 * @interface VendorLayoutProps
 * @property {React.ReactNode} children - Child components to render within the layout
 */
interface VendorLayoutProps {
  children: React.ReactNode;
}

/**
 * VendorLayout component providing consistent layout structure and navigation for vendor dashboard
 * 
 * @component
 * @param {VendorLayoutProps} props - Component props
 * @returns {JSX.Element} Vendor dashboard layout with navigation sidebar and content area
 * 
 * @example
 * <VendorLayout>
 *   <VendorDashboard />
 * </VendorLayout>
 * 
 * @features
 * - Vendor authentication status display
 * - Trial period countdown badge
 * - Pending bookings notification badge (using centralized data)
 * - Responsive sidebar navigation
 * - Logout functionality
 */
const VendorLayout: React.FC<VendorLayoutProps> = ({ children }) => {
  const { user, logout, bookings } = useVendorAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  /**
   * Handles vendor logout process
   * Clears authentication and redirects to vendor login page
   */
  const handleLogout = () => {
    logout();
    navigate('/vendor/login');
  };

  /**
   * Calculates remaining days in trial period
   * @param {string | null | undefined} trialEndDate - ISO date string of trial end
   * @returns {number} Days remaining in trial (0 if expired or no trial)
   */
  const calculateDaysRemaining = (trialEndDate?: string | null): number => {
    if (!trialEndDate) return 0;
    const end = new Date(trialEndDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const isInTrial = user?.registrationStatus === 'trial_active';
  const trialDaysRemaining = calculateDaysRemaining(user?.trialEndDate);

  /**
   * Calculates pending bookings count from centralized bookings data
   * @description Uses centralized bookings data from VendorAuthContext instead of direct API call
   * @returns {number} Count of bookings with pending status
   */
  const getPendingBookingsCount = (): number => {
    return bookings?.filter((booking: any) => booking.status === 'pending').length || 0;
  };

  const pendingCount = getPendingBookingsCount();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="font-bold text-xl text-secondary">
                  housnkuh
                </Link>
                <span className="ml-2 text-sm px-2 py-1 rounded bg-primary/10 text-primary font-medium">
                  Direktvermarkter
                </span>
                {isInTrial && (
                  <div className="ml-3 flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    <Star className="w-4 h-4 mr-1" />
                    <span>Probemonat - {trialDaysRemaining} Tag{trialDaysRemaining !== 1 ? 'e' : ''}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="hidden md:inline-block mr-4 text-gray-600">
                {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <div className="md:w-64 flex-shrink-0 mb-6 md:mb-0">
            <div className="bg-white shadow rounded-lg overflow-hidden sticky top-6">
              <div className="p-4 bg-primary/5 border-b border-gray-200">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-primary mr-2" />
                  <span className="font-medium text-secondary truncate">
                    {user?.name || 'Direktvermarkter'}
                  </span>
                </div>
              </div>
              
              <nav className="p-4 space-y-1">
                <Link
                  to="/vendor/dashboard"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/vendor/dashboard'
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Package className="mr-3 h-5 w-5" />
                  Dashboard
                </Link>
                
                <Link
                  to="/vendor/profile"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/vendor/profile'
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <User className="mr-3 h-5 w-5" />
                  Mein Profil
                </Link>
                
                <Link
                  to="/vendor/meine-buchungen"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium relative ${
                    location.pathname === '/vendor/meine-buchungen'
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Package className="mr-3 h-5 w-5" />
                  Meine Buchungen
                  {pendingCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </Link>
                
                <Link
                  to="/vendor/products"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/vendor/products'
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ShoppingCart className="mr-3 h-5 w-5" />
                  Produkte verwalten
                </Link>
                
                <Link
                  to="/vendor/reports"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/vendor/reports'
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="mr-3 h-5 w-5" />
                  Berichte einsehen
                </Link>
                
                <Link
                  to="/vendor/customer-invoices"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/vendor/customer-invoices'
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="mr-3 h-5 w-5" />
                  Ausgangsrechnungen
                </Link>
                
                <Link
                  to="/vendor/housnkuh-invoices"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/vendor/housnkuh-invoices'
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Receipt className="mr-3 h-5 w-5" />
                  Eingangsrechnungen
                </Link>
                
                <Link
                  to="/vendor/settings"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/vendor/settings'
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="mr-3 h-5 w-5" />
                  Einstellungen
                </Link>
                
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <Link
                    to="/"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Home className="mr-3 h-5 w-5" />
                    Zurück zur Website
                  </Link>
                </div>
              </nav>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 md:ml-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorLayout;