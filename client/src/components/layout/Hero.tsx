// src/components/layout/Hero.tsx
import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg'; // Pfad anpassen falls nötig
import heroLarge from "../assets/Hero_Large.png"; // Importiere dein Hero-Bild"C:\Users\evams\github-Projekte\housnkuh_app\client\src\components\assets\hero_bild.png"
import heroMedium from "../assets/Hero_Medium.png"; 
import heroSmall from "../assets/Hero_Small.png"; 

const Hero: React.FC = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Hintergrundgrafik */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-gray-50 to-gray-100"></div>
      {/* Dekorative Elemente */}
      <div className="absolute -top-10 right-0 -z-10 transform translate-x-1/3">
        <svg
          width="404"
          height="404"
          fill="none"
          viewBox="0 0 404 404"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="pattern-circles"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="10"
                cy="10"
                r="1.5"
                fill="var(--primary)"
                opacity="0.15"
              />
            </pattern>
          </defs>
          <rect width="404" height="404" fill="url(#pattern-circles)" />
        </svg>
      </div>

      <picture>
        <source media="(min-width: 1024px)" srcSet={heroLarge} />
        <source media="(min-width: 768px)" srcSet={heroMedium} />
        <img
          src={heroSmall}
          alt="Housnkuh Regionale Produkte"
          className="w-full rounded-lg shadow-lg"
        />
      </picture>

      <div className="absolute bottom-0 left-0 -z-10 transform -translate-x-1/4">
        <svg
          width="404"
          height="404"
          fill="none"
          viewBox="0 0 404 404"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="pattern-squares"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <rect
                x="3"
                y="3"
                width="14"
                height="14"
                rx="2"
                fill="var(--secondary)"
                opacity="0.08"
              />
            </pattern>
          </defs>
          <rect width="404" height="404" fill="url(#pattern-squares)" />
        </svg>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:flex lg:items-center lg:justify-between">
          <div className="lg:w-7/12 xl:w-6/12">
            <div className="mb-8 animate-fadeIn">
              <img
                src={logo}
                alt="housnkuh Logo"
                className="h-20 w-auto mb-6 animate-slideUp"
              />
              <h1 className="text-4xl md:text-5xl font-bold text-[var(--secondary)] mb-6 leading-tight animate-slideDown">
                Willkommen bei{" "}
                <span className="text-[var(--primary)]">housnkuh</span>
              </h1>
              <p className="text-xl md:text-2xl text-[var(--secondary)] font-semibold mb-4 animate-slideUp">
                Ihr innovativer Marktplatz für regionale Produkte in Kronach
              </p>
              <div className="flex items-center text-gray-600 animate-fadeIn mt-6">
                <Calendar className="w-5 h-5 mr-2 text-[var(--primary)]" />
                <p className="text-lg">Eröffnung im Frühsommer 2025</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8 animate-fadeIn">
              <Link
                to="/direktvermarkter"
                className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white px-6 py-3 rounded-lg 
                           transition-all duration-300 text-center font-medium shadow-md transform hover:translate-y-[-2px]"
              >
                Direktvermarkter entdecken
              </Link>
              <Link
                to="/mieten"
                className="border-2 border-[var(--secondary)] text-[var(--secondary)] px-6 py-3 rounded-lg 
                           hover:bg-[var(--secondary)] hover:text-white transition-all duration-300 
                           flex items-center justify-center gap-2 font-medium transform hover:translate-y-[-2px]"
              >
                <span>Verkaufsfläche mieten</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className="hidden lg:block lg:w-5/12 xl:w-6/12 mt-12 lg:mt-0">
            <div className="relative">
              {/* Hauptbild des Ladens (Platzhalter) */}
              <div className="rounded-lg shadow-2xl overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <img
                  src="/api/placeholder/600/400"
                  alt="housnkuh Marktplatz Konzept"
                  className="w-full h-auto"
                />

                {/* Overlay mit Textur */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--secondary)]/20 to-transparent mix-blend-overlay"></div>
              </div>

              {/* Dekorative Elemente */}
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[var(--primary)]/10 rounded-full"></div>
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-[var(--secondary)]/10 rounded-full"></div>

              {/* Erklärende Elemente */}
              <div className="absolute -right-6 bottom-12 bg-white px-4 py-3 rounded-lg shadow-md transform rotate-3">
                <p className="text-sm font-medium text-[var(--secondary)]">
                  Fast rund um die Uhr geöffnet!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;