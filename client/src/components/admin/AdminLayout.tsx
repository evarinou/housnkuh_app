// client/src/components/admin/AdminLayout.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Users, Mail, Package, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../components/assets/logo.svg';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div 
        className={`md:hidden fixed inset-0 flex z-40 transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        ></div>
        
        {/* Sidebar */}
        <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-secondary">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex-shrink-0 flex items-center px-4">
            <img className="h-10 w-auto" src={logo} alt="housnkuh" />
            <span className="text-white text-xl font-bold ml-2">Admin</span>
          </div>
          
          <div className="mt-5 flex-1 h-0 overflow-y-auto">
            <nav className="px-2 space-y-1">
              <Link
                to="/admin"
                className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-white hover:bg-primary"
                onClick={() => setSidebarOpen(false)}
              >
                <Home className="mr-4 h-6 w-6" />
                Dashboard
              </Link>
              
              <Link
                to="/admin/newsletter"
                className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-white hover:bg-primary"
                onClick={() => setSidebarOpen(false)}
              >
                <Mail className="mr-4 h-6 w-6" />
                Newsletter
              </Link>
              
              <Link
                to="/admin/users"
                className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-white hover:bg-primary"
                onClick={() => setSidebarOpen(false)}
              >
                <Users className="mr-4 h-6 w-6" />
                Benutzer
              </Link>
              
              <Link
                to="/admin/mietfaecher"
                className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-white hover:bg-primary"
                onClick={() => setSidebarOpen(false)}
              >
                <Package className="mr-4 h-6 w-6" />
                Mietfächer
              </Link>
              
              <Link
                to="/admin/vertraege"
                className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-white hover:bg-primary"
                onClick={() => setSidebarOpen(false)}
              >
                <FileText className="mr-4 h-6 w-6" />
                Verträge
              </Link>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-secondary">
              <img className="h-10 w-auto" src={logo} alt="housnkuh" />
              <span className="text-white text-xl font-bold ml-2">Admin</span>
            </div>
            
            <div className="flex-1 flex flex-col overflow-y-auto bg-secondary">
              <nav className="flex-1 px-2 py-4 space-y-1">
                <Link
                  to="/admin"
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-white hover:bg-primary"
                >
                  <Home className="mr-3 h-6 w-6" />
                  Dashboard
                </Link>
                
                <Link
                  to="/admin/newsletter"
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-white hover:bg-primary"
                >
                  <Mail className="mr-3 h-6 w-6" />
                  Newsletter
                </Link>
                
                <Link
                  to="/admin/users"
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-white hover:bg-primary"
                >
                  <Users className="mr-3 h-6 w-6" />
                  Benutzer
                </Link>
                
                <Link
                  to="/admin/mietfaecher"
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-white hover:bg-primary"
                >
                  <Package className="mr-3 h-6 w-6" />
                  Mietfächer
                </Link>
                
                <Link
                  to="/admin/vertraege"
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-white hover:bg-primary"
                >
                  <FileText className="mr-3 h-6 w-6" />
                  Verträge
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="md:hidden px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900">Admin-Bereich</h1>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              <div className="flex items-center">
                <span className="text-gray-700 mr-2">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <LogOut className="h-6 w-6" />// Fortsetzung von AdminLayout.tsx
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;