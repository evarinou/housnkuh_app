// client/src/components/layout/PublicLayout.tsx
import React from 'react';
import Navigation from './Navigation';
import Footer from './Footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-grow pt-24">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;