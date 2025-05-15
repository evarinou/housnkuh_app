// client/src/components/ContestBanner.tsx
import React, { useState, useEffect } from 'react';
import { Award, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContestBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  // Banner nach 1.5 Sekunden anzeigen, damit die Seite erst laden kann
  useEffect(() => {
    const timer = setTimeout(() => {
      // Prüfen, ob Banner bereits geschlossen wurde (im localStorage gespeichert)
      const hasBeenDismissed = localStorage.getItem('contestBannerDismissed');
      if (!hasBeenDismissed) {
        setIsVisible(true);
      } else {
        // Prüfen, ob die gespeicherte Zeit abgelaufen ist (24h)
        const dismissedTime = new Date(hasBeenDismissed);
        const now = new Date();
        if (now > dismissedTime) {
          // Zeit abgelaufen, Banner wieder anzeigen
          localStorage.removeItem('contestBannerDismissed');
          setIsVisible(true);
        } else {
          setIsDismissed(true);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Merken, dass Banner geschlossen wurde (für 24 Stunden)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    localStorage.setItem('contestBannerDismissed', expiryDate.toISOString());
    setIsDismissed(true);
  };

  const navigateToVendors = () => {
    navigate('/direktvermarkter'); // Navigation zur Vendors-Seite, angepasst an deine Route
    handleDismiss(); // Banner schließen nach Klick
  };

  // Wenn Banner dauerhaft geschlossen wurde, nichts rendern
  if (isDismissed) return null;

  return (
    <div 
      className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 max-w-md transform transition-all duration-500 ease-in-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-20 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-gradient-to-br from-secondary to-secondary/90 text-white rounded-lg shadow-xl p-6 border-2 border-primary">
        <button 
          onClick={handleDismiss} 
          className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 mb-4">
          <Award className="text-primary w-8 h-8 flex-shrink-0 animate-pulse" />
          <h3 className="text-xl font-bold">Erraten Sie unsere Direktvermarkter!</h3>
        </div>
        
        <p className="mb-4 text-white/90">
          Nehmen Sie am Wettbewerb teil und gewinnen Sie einen 50€-Gutschein! Welche drei lokalen Produzenten werden bei der Eröffnung dabei sein?
        </p>
        
        <button 
          onClick={navigateToVendors}
          className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-lg hover:bg-opacity-90 transition-all duration-200 font-medium"
        >
          <span>Jetzt teilnehmen</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ContestBanner;