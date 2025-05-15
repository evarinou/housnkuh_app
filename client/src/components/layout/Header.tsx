// client/src/components/layout/Header.tsx
import React from 'react';
import Navbar from './Navbar';

const Header: React.FC = () => {
  return (
    <header className="w-full">
      <Navbar />
      {/* Hier könnte z.B. ein Hero-Bereich für die Startseite platziert werden, falls gewünscht */}
    </header>
  );
};

export default Header;