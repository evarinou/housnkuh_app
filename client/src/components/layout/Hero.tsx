/**
 * @file Hero.tsx
 * @purpose Hero section component for homepage with marketing content, CTAs, and glassmorphism design
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, MapPin, ShoppingBag, Clock } from 'lucide-react';
import logo from '../../assets/images/logo.svg'; // Zurück zum ursprünglichen Logo
import heroImage from "../../assets/images/Hero_Large.png"; // Dein Hero-Bild

/**
 * Hero section component for the homepage with full-screen background and marketing content
 * 
 * Features:
 * - Full-viewport height hero section with background image
 * - Glassmorphism design with backdrop blur effects
 * - Interactive "What is housnkuh?" overlay with hover animations
 * - Two-column layout with main content and feature highlights
 * - Call-to-action buttons for key user journeys
 * - Responsive design with mobile-optimized layouts
 * - Opening date display with calendar icon
 * 
 * Design Elements:
 * - Gradient overlay for text readability
 * - Transform animations and hover effects
 * - Feature cards with icons and descriptions
 * - Glassmorphism styling throughout
 * 
 * @returns {JSX.Element} The complete hero section with all interactive elements
 */
const Hero: React.FC = () => {
  return (
    <section className="relative min-h-[100vh] flex items-end overflow-hidden">
      {/* Hintergrundbild mit verbessertem Overlay */}
      <div className="absolute inset-0 -z-10">
        <img 
          src={heroImage} 
          alt="housnkuh Regionaler Marktplatz" 
          className="w-full h-full object-cover"
        />
        <div 
  className="absolute inset-0 bg-gradient-to-t" 
  style={{ 
    backgroundImage: 'linear-gradient(to top, white, rgba(255, 255, 255, 0.1) 50%, transparent)' 
  }}
></div>
      </div>

      {/* "Was ist housnkuh?" Overlay - zentriert dann nach rechts versetzt */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 translate-x-32 -rotate-6 z-20 hidden lg:block">
        <Link
          to="/faq"
          className="group backdrop-blur-lg bg-white/25 border-2 border-white/40 rounded-2xl p-6 shadow-2xl 
                     transform transition-all duration-500 hover:bg-white/35 hover:scale-105 hover:-rotate-3
                     hover:shadow-3xl block max-w-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-secondary mb-2 drop-shadow-md">
                Was ist housnkuh?
              </h2>
              <p className="text-secondary/90 font-medium text-sm drop-shadow-sm">
                Klick hier um mehr zu erfahren
              </p>
            </div>
            <ArrowRight className="w-6 h-6 text-primary ml-4 transform transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* Hauptinhalt mit Glaseffekt - noch weiter nach unten verschoben */}
      <div className="max-w-7xl mx-auto px-6 w-full pb-32 pt-20 z-10">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="backdrop-blur-sm bg-white/30 rounded-2xl p-8 border border-white/40 shadow-xl transform transition-all duration-500 hover:bg-white/40">
            <div className="mb-8 animate-fadeIn">
              <div className="flex justify-center mb-6">
                <img
                  src={logo}
                  alt="housnkuh Logo"
                  className="h-24 w-auto animate-slideUp drop-shadow-xl"
                />
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-4 leading-tight animate-slideDown drop-shadow-md text-center">
                Dein Marktplatz für lokale Produkte
              </h1>
              
              <p className="text-lg md:text-xl text-secondary font-semibold mb-4 animate-slideUp drop-shadow-sm text-center">
                Frisch, lokal und nachhaltig direkt aus Kronach
              </p>
              
              <div className="flex items-center justify-center text-secondary animate-fadeIn mt-4">
                <Calendar className="w-4 h-4 mr-2 text-primary" />
                <p className="text-base">Eröffnung Sommer 2025</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 animate-fadeIn justify-center">
              <Link
                to="/direktvermarkter"
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg 
                         transition-all duration-300 text-center font-medium shadow-md transform hover:translate-y-[-2px]
                         border border-primary/50 text-sm"
              >
                Direktvermarkter entdecken
              </Link>
              <Link
                to="/pricing"
                className="border border-secondary text-secondary px-5 py-2 rounded-lg 
                         hover:bg-secondary hover:text-white transition-all duration-300 
                         flex items-center justify-center gap-1 font-medium transform hover:translate-y-[-2px] text-sm"
              >
                <span>Verkaufsfläche mieten</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Rechte Seite mit Features in Glasboxen */}
          <div className="hidden lg:flex flex-col justify-center space-y-4">
            <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 transform transition-all duration-300 hover:bg-white/30 shadow-md">
              <div className="flex items-start">
                <div className="bg-primary/20 p-2 rounded-full mr-3">
                  <Clock className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-secondary mb-1">Fast 24/7 Einkaufen</h3>
                  <p className="text-secondary/90 text-sm">Einkaufen, wann immer du möchtest – dank moderner Zutrittskontrolle</p>
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 transform transition-all duration-300 hover:bg-white/30 shadow-md">
              <div className="flex items-start">
                <div className="bg-primary/20 p-2 rounded-full mr-3">
                  <MapPin className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-secondary mb-1">100% Regional</h3>
                  <p className="text-secondary/90 text-sm">Alle Produkte stammen von Erzeugern aus der Region Kronach</p>
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 transform transition-all duration-300 hover:bg-white/30 shadow-md">
              <div className="flex items-start">
                <div className="bg-primary/20 p-2 rounded-full mr-3">
                  <ShoppingBag className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-secondary mb-1">Vielfältiges Sortiment</h3>
                  <p className="text-secondary/90 text-sm">Von Lebensmitteln bis zu Handwerksprodukten der Region</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kein zusätzlicher Übergang nötig, da wir bereits ein Overlay haben */}
    </section>
  );
};

export default Hero;