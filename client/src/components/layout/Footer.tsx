// client/src/components/layout/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-secondary text-white py-8 mt-auto">
      <div className="container mx-auto px-6 text-center">
        <p>&copy; {currentYear} Housnkuh. Alle Rechte vorbehalten.</p>
        <div className="mt-2">
          <Link to="/impressum" className="hover:text-primary px-2">Impressum</Link>
          |
          <Link to="/datenschutz" className="hover:text-primary px-2">Datenschutz</Link>
        </div>
        {/* Weitere Links oder Informationen hier */}
      </div>
    </footer>
  );
};

export default Footer;