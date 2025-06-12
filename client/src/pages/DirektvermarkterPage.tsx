// client/src/pages/DirektvermarkterPage.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, List, MapPin, Users, ShoppingBag, Star } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

// Feature Card Component
interface FeatureCardProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, delay }) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({ threshold: 0.2, triggerOnce: true });

  useEffect(() => {
    if (inView) {
      controls.start({
        y: 0,
        opacity: 1,
        transition: { duration: 0.6, delay: delay * 0.2 }
      });
    }
  }, [controls, inView, delay]);

  return (
    <motion.div 
      ref={ref}
      initial={{ y: 50, opacity: 0 }}
      animate={controls}
      className="bg-gray-50 rounded-2xl p-8 hover:bg-gray-100 transition-all duration-300 text-center"
    >
      <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-6">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-secondary mb-4">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </motion.div>
  );
};

const DirektvermarkterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/95 to-primary/95 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <pattern id="hero-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="2" fill="currentColor" />
            </pattern>
            <rect width="100" height="100" fill="url(#hero-pattern)" />
          </svg>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <motion.h1 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-5xl font-bold mb-6"
            >
              Entdecken Sie unsere<br />
              <span className="text-primary-200">Direktvermarkter</span>
            </motion.h1>
            <motion.p 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-white/90 max-w-3xl mx-auto"
            >
              Regionale Qualität, persönlicher Kontakt und frische Produkte direkt vom Erzeuger
            </motion.p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link 
                to="/direktvermarkter/uebersicht"
                className="group block bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-white/20 p-3 rounded-full mr-4 group-hover:bg-white/30 transition-all duration-300">
                    <List className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold">Übersicht aller Direktvermarkter</h3>
                </div>
                <p className="text-white/90 mb-6 leading-relaxed">
                  Durchsuchen Sie alle registrierten Direktvermarkter, filtern Sie nach Produkten und finden Sie genau das, was Sie suchen.
                </p>
                <div className="flex items-center text-white group-hover:translate-x-2 transition-transform duration-300">
                  <span className="font-semibold mr-2">Zur Übersicht</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link 
                to="/direktvermarkter/karte"
                className="group block bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-white/20 p-3 rounded-full mr-4 group-hover:bg-white/30 transition-all duration-300">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold">Standorte auf der Karte</h3>
                </div>
                <p className="text-white/90 mb-6 leading-relaxed">
                  Entdecken Sie alle Direktvermarkter-Standorte auf einer interaktiven Karte und finden Sie die nächstgelegenen Anbieter.
                </p>
                <div className="flex items-center text-white group-hover:translate-x-2 transition-transform duration-300">
                  <span className="font-semibold mr-2">Zur Karte</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-4">
              Warum housnkuh Direktvermarkter?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Erleben Sie die Vorteile regionaler Direktvermarktung und unterstützen Sie lokale Erzeuger
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={ShoppingBag}
              title="Frische Qualität"
              description="Produkte direkt vom Erzeuger ohne lange Transportwege für maximale Frische und Qualität."
              delay={0}
            />
            <FeatureCard 
              icon={Users}
              title="Persönlicher Kontakt"
              description="Lernen Sie die Menschen hinter den Produkten kennen und erfahren Sie mehr über Herkunft und Herstellung."
              delay={1}
            />
            <FeatureCard 
              icon={Star}
              title="Regionale Vielfalt"
              description="Entdecken Sie die kulinarische Vielfalt Ihrer Region und unterstützen Sie lokale Betriebe."
              delay={2}
            />
          </div>
        </div>
      </section>
      
      {/* Call-to-Action Section */}
      <section className="py-20 bg-gradient-to-r from-secondary/10 to-primary/10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-6">
            Sind Sie Direktvermarkter?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Möchten Sie Ihre Produkte bei housnkuh anbieten? Registrieren Sie sich als Direktvermarkter 
            und profitieren Sie von unserer innovativen Plattform für regionale Vermarktung.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link 
              to="/vendor/login" 
              className="group px-8 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span className="flex items-center justify-center">
                Als Direktvermarkter anmelden
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </Link>
            <Link 
              to="/pricing" 
              className="group px-8 py-4 bg-white border-2 border-secondary text-secondary font-semibold rounded-xl hover:bg-secondary hover:text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span className="flex items-center justify-center">
                Mehr über Mietfächer erfahren
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DirektvermarkterPage;