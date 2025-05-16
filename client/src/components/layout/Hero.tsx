import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, MapPin, ShoppingBag, Clock } from 'lucide-react';
import logo from '../assets/logo.svg';
import heroImage from "../assets/Hero_Large.png"; // Dein Hero-Bild

const Hero: React.FC = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Hintergrundbild mit Overlay */}
      <div className="absolute inset-0 -z-10">
        <img 
          src={heroImage} 
          alt="housnkuh Regionaler Marktplatz" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/50 to-transparent"></div>
      </div>

      {/* Hauptinhalt mit Glaseffekt */}
      <div className="max-w-7xl mx-auto px-6 w-full py-12 z-10">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="backdrop-blur-md bg-white/20 rounded-2xl p-8 border border-white/30 shadow-2xl transform transition-all duration-500 hover:bg-white/30">
            <div className="mb-8 animate-fadeIn">
              <img
                src={logo}
                alt="housnkuh Logo"
                className="h-24 w-auto mb-8 animate-slideUp drop-shadow-xl"
              />
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight animate-slideDown drop-shadow-md">
                Willkommen bei{" "}
                <span className="text-primary">housnkuh</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-white font-semibold mb-6 animate-slideUp drop-shadow-sm">
                Ihr innovativer Marktplatz für regionale Produkte in Kronach
              </p>
              
              <div className="flex items-center text-white animate-fadeIn mt-6">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                <p className="text-lg">Eröffnung im Frühsommer 2025</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8 animate-fadeIn">
              <Link
                to="/direktvermarkter"
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg 
                         transition-all duration-300 text-center font-medium shadow-md transform hover:translate-y-[-2px]
                         border border-primary/50"
              >
                Direktvermarkter entdecken
              </Link>
              <Link
                to="/mieten"
                className="border-2 border-white text-white px-6 py-3 rounded-lg 
                         hover:bg-white hover:text-secondary transition-all duration-300 
                         flex items-center justify-center gap-2 font-medium transform hover:translate-y-[-2px]"
              >
                <span>Verkaufsfläche mieten</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Rechte Seite mit Features in Glasboxen */}
          <div className="hidden lg:flex flex-col justify-center space-y-6">
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-6 transform transition-all duration-300 hover:bg-white/20 shadow-lg">
              <div className="flex items-start">
                <div className="bg-primary/20 p-3 rounded-full mr-4">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Fast 24/7 Einkaufen</h3>
                  <p className="text-white/90">Einkaufen, wann immer Sie möchten – dank moderner Zutrittskontrolle</p>
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-6 transform transition-all duration-300 hover:bg-white/20 shadow-lg">
              <div className="flex items-start">
                <div className="bg-primary/20 p-3 rounded-full mr-4">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">100% Regional</h3>
                  <p className="text-white/90">Alle Produkte stammen von Erzeugern aus der Region Kronach</p>
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-6 transform transition-all duration-300 hover:bg-white/20 shadow-lg">
              <div className="flex items-start">
                <div className="bg-primary/20 p-3 rounded-full mr-4">
                  <ShoppingBag className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Vielfältiges Sortiment</h3>
                  <p className="text-white/90">Von Lebensmitteln bis zu Handwerksprodukten der Region</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dekorative Elemente */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent"></div>
    </section>
  );
};

export default Hero;