/**
 * @file ConstructionBanner.tsx
 * @purpose Construction status banner displaying store setup progress with dynamic updates and timeline information
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React, { useEffect, useState } from 'react';
import { Settings, AlertTriangle, Calendar, Clock } from 'lucide-react';
import axios from 'axios';

const ConstructionBanner: React.FC = () => {
  const [storeOpeningDate, setStoreOpeningDate] = useState<Date | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  
  // Lade Eröffnungsdatum
  useEffect(() => {
    const fetchStoreOpening = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        const response = await axios.get(`${apiUrl}/public/store-opening`);
        
        if (response.data.success && response.data.storeOpening.enabled && response.data.storeOpening.openingDate) {
          setStoreOpeningDate(new Date(response.data.storeOpening.openingDate));
          setIsStoreOpen(response.data.storeOpening.isStoreOpen);
        }
      } catch (err) {
        console.error('Error fetching store opening:', err);
      }
    };
    
    fetchStoreOpening();
  }, []);
  
  // Countdown-Timer
  useEffect(() => {
    if (!storeOpeningDate || isStoreOpen) return;
    
    const calculateCountdown = () => {
      const now = new Date().getTime();
      const openingTime = storeOpeningDate.getTime();
      const distance = openingTime - now;
      
      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        setCountdown({ days, hours, minutes });
      } else {
        setIsStoreOpen(true);
      }
    };
    
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [storeOpeningDate, isStoreOpen]);
  
  // Fallback für hardcodierte Zeit falls keine API-Daten
  const calculateTimeRemaining = () => {
    const openingDate = new Date('2025-06-01T00:00:00');
    const currentDate = new Date();
    
    const totalDays = Math.floor((openingDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    
    return { months, days };
  };
  
  const { months, days } = calculateTimeRemaining();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 my-8">
      <div className="bg-secondary text-white rounded-lg shadow-lg overflow-hidden transform -rotate-1 hover:rotate-0 transition-transform duration-300">
        <div className="relative px-6 py-8">
          {/* Diagonale Streifen im Hintergrund */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(225, 117, 100, 1) 20px, rgba(225, 117, 100, 1) 40px)',
              transform: 'rotate(0deg)',
              zIndex: 0
            }}></div>
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Linke Seite mit Icons */}
            <div className="flex items-center">
              <div className="bg-primary rounded-full p-4 mr-4">
                <Settings className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '10s' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Die Housnkuh ist fleißig am Werkeln!</h2>
                <p className="text-white text-opacity-80">
                  Der Marktplatz wird aktuell renoviert und aufgebaut.
                </p>
              </div>
            </div>
            
            {/* Rechte Seite mit Countdown */}
            <div className="bg-white bg-opacity-10 rounded-lg px-5 py-4 text-center">
              {storeOpeningDate && !isStoreOpen ? (
                <>
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 mr-2 text-primary" />
                    <span className="font-semibold">Eröffnung am:</span>
                  </div>
                  <div className="text-sm mb-3">
                    {storeOpeningDate.toLocaleDateString('de-DE', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-center">
                      <span className="text-2xl font-bold">{countdown.days}</span>
                      <p className="text-xs text-white text-opacity-80">Tage</p>
                    </div>
                    <div className="text-xl font-bold">:</div>
                    <div className="text-center">
                      <span className="text-2xl font-bold">{countdown.hours}</span>
                      <p className="text-xs text-white text-opacity-80">Std</p>
                    </div>
                    <div className="text-xl font-bold">:</div>
                    <div className="text-center">
                      <span className="text-2xl font-bold">{countdown.minutes}</span>
                      <p className="text-xs text-white text-opacity-80">Min</p>
                    </div>
                  </div>
                </>
              ) : isStoreOpen ? (
                <>
                  <div className="flex items-center justify-center mb-2">
                    <Calendar className="w-5 h-5 mr-2 text-primary" />
                    <span className="font-semibold">Wir sind geöffnet!</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center mb-2">
                    <Calendar className="w-5 h-5 mr-2 text-primary" />
                    <span className="font-semibold">Eröffnung in ca.:</span>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <span className="text-3xl font-bold">{months}</span>
                      <p className="text-sm text-white text-opacity-80">Monate</p>
                    </div>
                    <div className="text-3xl font-bold">:</div>
                    <div className="text-center">
                      <span className="text-3xl font-bold">{days}</span>
                      <p className="text-sm text-white text-opacity-80">Tage</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Baustellensymbole als Deko */}
          <div className="absolute -top-4 -right-4 transform rotate-12">
            <AlertTriangle className="w-12 h-12 text-primary opacity-40" />
          </div>
          <div className="absolute -bottom-4 -left-4 transform -rotate-12">
            <Settings className="w-10 h-10 text-primary opacity-40" />
          </div>
        </div>
        
        {/* Fortschrittsbalken */}
        <div className="h-4 bg-gray-700 relative">
          <div 
            className="h-full bg-primary"
            style={{ width: '60%' }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ConstructionBanner;