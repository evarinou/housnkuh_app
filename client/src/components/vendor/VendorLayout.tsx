// client/src/components/vendor/VendorLayout.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Package, Home, LogOut, Settings, FileText, ShoppingCart, BarChart3, Receipt, Star } from 'lucide-react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

interface VendorLayoutProps {
  children: React.ReactNode;
}

const VendorLayout: React.FC<VendorLayoutProps> = ({ children }) => {
  const { user, logout } = useVendorAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  
  const handleLogout = () => {
    logout();
    navigate('/vendor/login');
  };

  // Calculate trial days remaining
  const calculateDaysRemaining = (trialEndDate?: string | null): number => {
    if (!trialEndDate) return 0;
    const end = new Date(trialEndDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const isInTrial = user?.registrationStatus === 'trial_active';
  const trialDaysRemaining = calculateDaysRemaining(user?.trialEndDate);

  // Fetch pending bookings count for notification badge
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!user?.id) return;
      
      try {
        const token = localStorage.getItem('vendorToken');
        const response = await fetch(`http://localhost:4000/api/vendor-auth/bookings/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const pendingBookings = data.bookings?.filter((booking: any) => booking.status === 'pending') || [];
          setPendingCount(pendingBookings.length);
        }
      } catch (error) {
        console.error('Error fetching pending bookings count:', error);
      }
    };

    fetchPendingCount();
  }, [user?.id]);
  
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
          
          {/* Hauptinhalt */}
          <div className="md:ml-8 flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorLayout;