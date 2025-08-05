/**
 * @file CookieBanner.tsx
 * @purpose GDPR-compliant cookie consent banner with granular control and preferences management
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React, { useState, useEffect } from 'react';

// Einfache Alert Dialog Komponente ohne shadcn/ui Abhängigkeit
const AlertDialog: React.FC<{
  open: boolean;
  children: React.ReactNode;
}> = ({ open, children }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 sm:p-0">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="relative z-50 bg-white rounded-t-lg sm:rounded-lg shadow-lg max-w-md w-full">
        {children}
      </div>
    </div>
  );
};

const AlertDialogContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return (
    <div className={`p-6 sm:p-8 ${className}`}>
      {children}
    </div>
  );
};

const AlertDialogHeader: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <div className="mb-6">{children}</div>;
};

const AlertDialogTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>;
};

const AlertDialogDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return <p className={`mt-2 ${className}`}>{children}</p>;
};

const AlertDialogFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return <div className={`flex justify-end gap-3 mt-6 ${className}`}>{children}</div>;
};

const AlertDialogAction: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = "", onClick }) => {
  return (
    <button 
      className={`px-4 py-2 text-white bg-primary rounded-lg font-medium hover:bg-primary/90 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const AlertDialogCancel: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = "", onClick }) => {
  return (
    <button 
      className={`px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const CookieBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Prüfe, ob Cookie-Einwilligung bereits existiert
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  return (
    <AlertDialog open={showBanner}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-secondary">Cookie-Einstellungen</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            Wir verwenden Cookies, um dir die bestmögliche Erfahrung auf unserer Website zu bieten. 
            Diese helfen uns zu verstehen, wie du unsere Website nutzt und ermöglichen grundlegende Funktionen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-start">
          <AlertDialogAction
            onClick={handleAccept}
            className="bg-primary hover:bg-primary/90"
          >
            Alle akzeptieren
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={handleDecline}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            Nur notwendige Cookies
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CookieBanner;