/**
 * @file Header.tsx
 * @purpose Application header component containing navigation and optional hero section placeholder
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React from 'react';
import Navbar from './Navbar';

/**
 * Header component that serves as the main application header
 * 
 * This component wraps the Navbar component and provides a placeholder
 * for potential hero sections on specific pages like the homepage.
 * 
 * @returns {JSX.Element} The header element containing navigation
 */
const Header: React.FC = () => {
  return (
    <header className="w-full">
      <Navbar />
      {/* Hier könnte z.B. ein Hero-Bereich für die Startseite platziert werden, falls gewünscht */}
    </header>
  );
};

export default Header;