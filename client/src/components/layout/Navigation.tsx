// src/components/layout/Navigation.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from '../assets/logo.svg'; // Pfad anpassen falls nötig

const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const location = useLocation();

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

  // Schließt das mobile Menü, wenn die Route wechselt
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  
  // Prüft, ob ein Link aktiv ist
  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };
  
  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md py-2' : 'bg-white shadow-lg py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo mit korrektem Abstand gemäß Styleguide */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="block p-2">
              <img className="h-20 w-auto" src={logo} alt="housnkuh Logo" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/direktvermarkter" 
              className={`font-medium hover:text-[var(--primary)] transition-colors duration-200 pb-1 border-b-2 ${
                isActive('/direktvermarkter') 
                  ? 'text-[var(--primary)] border-[var(--primary)]' 
                  : 'text-[var(--secondary)] border-transparent'
              }`}
            >
              Direktvermarkter
            </Link>
            <Link 
              to="/standort" 
              className={`font-medium hover:text-[var(--primary)] transition-colors duration-200 pb-1 border-b-2 ${
                isActive('/standort') 
                  ? 'text-[var(--primary)] border-[var(--primary)]' 
                  : 'text-[var(--secondary)] border-transparent'
              }`}
            >
              Standort
            </Link>
            <Link 
              to="/mieten"
              className={`font-medium hover:text-[var(--primary)] transition-colors duration-200 pb-1 border-b-2 ${
                isActive('/mieten') 
                  ? 'text-[var(--primary)] border-[var(--primary)]' 
                  : 'text-[var(--secondary)] border-transparent'
              }`}
            >
              Verkaufsfläche mieten
            </Link>
            <Link 
              to="/kontakt"
              className={`text-white bg-[var(--primary)] hover:bg-[var(--primary)]/90 px-4 py-2 rounded-lg transition-colors duration-200 ${
                isActive('/kontakt') ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''
              }`}
            >
              Kontakt
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="focus:outline-none text-[var(--secondary)] hover:text-[var(--primary)] transition-colors duration-200 p-2"
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
        isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 py-2 bg-white shadow-inner">
          <Link
            to="/direktvermarkter"
            className={`block px-3 py-2 rounded-md font-medium hover:bg-gray-100 ${
              isActive('/direktvermarkter') ? 'text-[var(--primary)]' : 'text-[var(--secondary)]'
            }`}
          >
            Direktvermarkter
          </Link>
          <Link
            to="/standort"
            className={`block px-3 py-2 rounded-md font-medium hover:bg-gray-100 ${
              isActive('/standort') ? 'text-[var(--primary)]' : 'text-[var(--secondary)]'
            }`}
          >
            Standort
          </Link>
          <Link
            to="/mieten"
            className={`block px-3 py-2 rounded-md font-medium hover:bg-gray-100 ${
              isActive('/mieten') ? 'text-[var(--primary)]' : 'text-[var(--secondary)]'
            }`}
          >
            Verkaufsfläche mieten
          </Link>
          <Link
            to="/kontakt"
            className={`block px-3 py-2 mt-2 bg-[var(--primary)] text-white rounded-md font-medium hover:bg-[var(--primary)]/90 ${
              isActive('/kontakt') ? 'ring-2 ring-offset-2 ring-[var(--primary)]' : ''
            }`}
          >
            Kontakt
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;