/**
 * @file Navigation.tsx
 * @purpose Main navigation component with responsive design, authentication state, and scroll effects
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogIn, Shield } from 'lucide-react';
import logo from '../../assets/images/logo.svg';
import { AuthStateContext } from '../../contexts/AuthContext';
import { VendorAuthStateContext } from '../../contexts/VendorAuthContext';
import { resolveImageUrl } from '../../utils/imageUtils';

/**
 * Safe context access with direct context checking
 * 
 * Uses direct context access to distinguish between "no context" and "not authenticated"
 * This allows proper authentication state detection even on public routes
 */
/**
 * Safe wrapper for admin authentication context using direct context access
 * @returns {object} Admin authentication state with proper null handling
 */


/**
 * Main navigation component with responsive design and authentication integration
 * 
 * Features:
 * - Responsive design with mobile hamburger menu
 * - Scroll-based styling changes (background opacity and padding)
 * - Dual authentication support (admin and vendor contexts)
 * - Profile image display for authenticated vendors
 * - Dynamic navigation based on authentication state
 * - Accessible mobile menu with proper ARIA attributes
 * 
 * @returns {JSX.Element} The navigation bar with all interactive elements
 */
const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Direct context access with null-safe checking
  const authContext = useContext(AuthStateContext);
  const vendorContext = useContext(VendorAuthStateContext);
  
  // Null-safe authentication state logic
  const isAdminAuth = authContext?.isAuthenticated ?? false;
  const isVendorAuth = vendorContext?.isAuthenticated ?? false;
  const vendorUser = vendorContext?.user;
  
  // Determine if any user is authenticated
  const isAuthenticated = isAdminAuth || isVendorAuth;
  
  // Enhanced dashboard routing with better UX
  const dashboardRoute = useMemo(() => {
    if (isAdminAuth) return '/admin';
    if (isVendorAuth) return '/vendor/dashboard';
    return '/vendor/login';
  }, [isAdminAuth, isVendorAuth]);
  
  // Optional auto-redirect preference for admin users
  const shouldAutoRedirectAdmin = useMemo(() => {
    return localStorage.getItem('adminAutoRedirect') === 'true';
  }, []);
  
  // Enhanced click handler with auto-redirect capability
  const handleDashboardClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Auto-redirect admin from homepage to dashboard if preference is set
    if (isAdminAuth && shouldAutoRedirectAdmin && location.pathname === '/') {
      navigate('/admin');
    } else {
      // Normal navigation to appropriate dashboard
      navigate(dashboardRoute);
    }
  }, [isAdminAuth, shouldAutoRedirectAdmin, location.pathname, dashboardRoute, navigate]);
  
  // Dashboard button text based on user type
  const dashboardButtonText = useMemo(() => {
    if (isAdminAuth) return 'Admin Panel';
    if (isVendorAuth) return 'Dashboard';
    return 'Login';
  }, [isAdminAuth, isVendorAuth]);
  
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
              <button 
                onClick={handleDashboardClick}
                className={`flex items-center font-medium transition-all ${
                  isAdminAuth 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-md'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {/* Admin Icon for Admin Users */}
                {isAdminAuth && (
                  <Shield className="w-5 h-5 mr-2" />
                )}
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
                <span>{dashboardButtonText}</span>
              </button>
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
            <button
              onClick={(e) => {
                handleDashboardClick(e);
                setIsOpen(false);
              }}
              className={`flex items-center px-3 py-2 mt-2 rounded-md font-medium w-full text-left ${
                isAdminAuth 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                  : 'text-secondary hover:bg-gray-100'
              }`}
            >
              {/* Admin Icon for Admin Users */}
              {isAdminAuth && (
                <Shield className="w-5 h-5 mr-2" />
              )}
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
              {dashboardButtonText}
            </button>
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