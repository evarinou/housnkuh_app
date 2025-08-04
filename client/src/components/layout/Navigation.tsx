// client/src/components/layout/Navigation.tsx oder Navbar.tsx
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, User, LogIn } from 'lucide-react';
import logo from '../../assets/images/logo.svg';
import { useAuth } from '../../contexts/AuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { resolveImageUrl } from '../../utils/imageUtils';

// Safe hook wrappers that handle missing context
const useSafeAuth = () => {
  try {
    return useAuth();
  } catch {
    return { isAuthenticated: false, user: null };
  }
};

const useSafeVendorAuth = () => {
  try {
    return useVendorAuth();
  } catch {
    return { isAuthenticated: false, user: null };
  }
};

const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  
  // Authentication contexts with safe access
  const { isAuthenticated: isAdminAuth } = useSafeAuth();
  const { isAuthenticated: isVendorAuth, user: vendorUser } = useSafeVendorAuth();
  
  // Determine if any user is authenticated and their dashboard route
  const isAuthenticated = isAdminAuth || isVendorAuth;
  const dashboardRoute = isAdminAuth ? '/admin' : '/vendor/dashboard';
  // const userDisplayName = adminUser?.name || vendorUser?.name || 'User';
  
  // Scroll-Handler für Hintergrundeffekt
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md py-2' : 'bg-white shadow-lg py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo mit korrektem Abstand gemäß Styleguide */}
          <div className="flex-shrink-0 flex items-center">
            <NavLink to="/" className="block p-2">
              <img className="h-20 w-auto" src={logo} alt="housnkuh Logo" />
            </NavLink>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink 
              to="/direktvermarkter" 
              className={({ isActive }) => isActive 
                ? "text-primary border-b-2 border-primary font-medium" 
                : "hover:text-primary text-secondary border-transparent border-b-2 font-medium"
              }
            >
              Direktvermarkter
            </NavLink>
            <NavLink 
              to="/standort" 
              className={({ isActive }) => isActive 
                ? "text-primary border-b-2 border-primary font-medium" 
                : "hover:text-primary text-secondary border-transparent border-b-2 font-medium"
              }
            >
              Standort
            </NavLink>
            <NavLink 
              to="/pricing" 
              className={({ isActive }) => isActive 
                ? "text-primary border-b-2 border-primary font-medium" 
                : "hover:text-primary text-secondary border-transparent border-b-2 font-medium"
              }
            >
              Verkaufsfläche mieten
            </NavLink>
            <NavLink 
              to="/kontakt"
              className={({ isActive }) => isActive 
                ? "bg-primary text-white px-4 py-2 rounded-lg ring-2 ring-primary ring-offset-2 font-medium" 
                : "bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
              }
            >
              Kontakt
            </NavLink>
            {isAuthenticated ? (
              <NavLink 
                to={dashboardRoute}
                className="flex items-center text-secondary hover:text-primary font-medium"
              >
                {/* Vendor Profile Image */}
                {isVendorAuth && vendorUser?.profilBild ? (
                  <img 
                    src={resolveImageUrl(vendorUser.profilBild)} 
                    alt={`${vendorUser.name} Profil`}
                    className="w-8 h-8 rounded-full object-cover mr-2 border border-gray-200"
                    onError={(e) => {
                      // Fallback to default icon on error
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'inline-block';
                    }}
                  />
                ) : null}
                {isVendorAuth && !vendorUser?.profilBild ? (
                  <User className="w-8 h-8 mr-2 p-1 rounded-full bg-gray-100 text-gray-600" />
                ) : null}
                <span>Dashboard</span>
              </NavLink>
            ) : (
              <NavLink 
                to="/vendor/login"
                className="flex items-center text-secondary hover:text-primary font-medium"
              >
                <User className="w-4 h-4 mr-1" />
                <span>Login</span>
              </NavLink>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="focus:outline-none text-secondary hover:text-primary transition-colors duration-200 p-2"
              aria-expanded={isOpen}
              aria-label={isOpen ? "Menü schließen" : "Menü öffnen"}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation - Verbesserte Animation */}
      <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 py-2 bg-white shadow-inner">
          <NavLink
            to="/direktvermarkter"
            className={({ isActive }) => `block px-3 py-2 rounded-md font-medium hover:bg-gray-100 ${
              isActive ? 'text-primary' : 'text-secondary'
            }`}
            onClick={() => setIsOpen(false)}
          >
            Direktvermarkter
          </NavLink>
          <NavLink
            to="/standort"
            className={({ isActive }) => `block px-3 py-2 rounded-md font-medium hover:bg-gray-100 ${
              isActive ? 'text-primary' : 'text-secondary'
            }`}
            onClick={() => setIsOpen(false)}
          >
            Standort
          </NavLink>
          <NavLink
            to="/pricing"
            className={({ isActive }) => `block px-3 py-2 rounded-md font-medium hover:bg-gray-100 ${
              isActive ? 'text-primary' : 'text-secondary'
            }`}
            onClick={() => setIsOpen(false)}
          >
            Verkaufsfläche mieten
          </NavLink>
          <NavLink
            to="/kontakt"
            className={({ isActive }) => `block px-3 py-2 mt-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 ${
              isActive ? 'ring-2 ring-offset-2 ring-primary' : ''
            }`}
            onClick={() => setIsOpen(false)}
          >
            Kontakt
          </NavLink>
          {isAuthenticated ? (
            <NavLink
              to={dashboardRoute}
              className="flex items-center px-3 py-2 mt-2 rounded-md font-medium text-secondary hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              {/* Vendor Profile Image for Mobile */}
              {isVendorAuth && vendorUser?.profilBild ? (
                <img 
                  src={resolveImageUrl(vendorUser.profilBild)} 
                  alt={`${vendorUser.name} Profil`}
                  className="w-6 h-6 rounded-full object-cover mr-2 border border-gray-200"
                  onError={(e) => {
                    // Fallback to default icon on error
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'inline-block';
                  }}
                />
              ) : null}
              {isVendorAuth && !vendorUser?.profilBild ? (
                <User className="w-6 h-6 mr-2 p-1 rounded-full bg-gray-100 text-gray-600" />
              ) : null}
              Dashboard
            </NavLink>
          ) : (
            <NavLink
              to="/vendor/login"
              className="flex items-center px-3 py-2 mt-2 rounded-md font-medium text-secondary hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Direktvermarkter Login
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;