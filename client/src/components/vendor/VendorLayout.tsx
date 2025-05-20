// client/src/components/vendor/VendorLayout.tsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Package, Home, LogOut } from 'lucide-react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

interface VendorLayoutProps {
  children: React.ReactNode;
}

const VendorLayout: React.FC<VendorLayoutProps> = ({ children }) => {
  const { user, logout } = useVendorAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/vendor/login');
  };
  
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
                
                {/* Weitere Menüpunkte können hier hinzugefügt werden */}
                
                <Link
                  to="/"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <Home className="mr-3 h-5 w-5" />
                  Zurück zur Website
                </Link>
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