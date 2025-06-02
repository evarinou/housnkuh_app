import React, { useEffect } from 'react';
import { Calendar, Clock, ShoppingBag, Users, MapPin, Heart } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import NewsletterSignup from '../components/NewsletterSignup';
import ConceptGraphic from '../components/ConceptGraphic';
import ConstructionBanner from '../components/ConstructionBanner';
import InstagramFeed from '../components/InstagramFeed';

// Feature Card Komponente mit Animation und Glaseffekt
interface FeatureCardProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, delay = 0 }) => {
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
      className="backdrop-blur-lg bg-white/20 border border-white/30 rounded-xl shadow-xl p-6 
                 transform transition-all duration-300 hover:bg-white/30 hover:shadow-2xl 
                 hover:translate-y-[-5px]"
    >
      <div className="flex items-start">
        <div className="bg-primary/30 p-3 rounded-full mr-4">
          <Icon size={24} className="text-secondary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2 text-secondary">{title}</h3>
          <p className="text-gray-700">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};

// List Item mit verbesserter Animation
interface AnimatedListItemProps {
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  delay?: number;
}

const AnimatedListItem: React.FC<AnimatedListItemProps> = ({ icon: Icon, children, delay = 0 }) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({ threshold: 0.2, triggerOnce: true });

  useEffect(() => {
    if (inView) {
      controls.start({
        x: 0,
        opacity: 1,
        transition: { duration: 0.5, delay: delay * 0.15 }
      });
    }
  }, [controls, inView, delay]);

  return (
    <motion.li 
      ref={ref}
      initial={{ x: -20, opacity: 0 }}
      animate={controls}
      className="flex items-center mb-3 backdrop-blur-md bg-white/20 rounded-lg p-3 border border-white/20
                 transform transition-all duration-300 hover:bg-white/30"
    >
      <Icon className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
      <span className="text-gray-800">{children}</span>
    </motion.li>
  );
};

// History Section mit Glaseffekt
const HistorySection: React.FC = () => {
  const controls = useAnimation();
  const [ref, inView] = useInView({ threshold: 0.2, triggerOnce: true });

  useEffect(() => {
    if (inView) {
      controls.start({
        y: 0,
        opacity: 1,
        transition: { duration: 0.8 }
      });
    }
  }, [controls, inView]);

  return (
    <section className="relative py-20 overflow-hidden mt-16">
      {/* Hintergrund */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-gray-100 to-white"></div>
      
      {/* Dekorative Elemente */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-4xl mx-auto px-6">
        <motion.div 
          ref={ref}
          initial={{ y: 60, opacity: 0 }}
          animate={controls}
          className="backdrop-blur-md bg-white/40 rounded-2xl p-8 shadow-xl border border-white/50"
        >
          <h2 className="text-3xl font-bold text-secondary mb-8 text-center">
            Die Geschichte hinter dem Namen
          </h2>
          <div className="space-y-6">
            <p className="text-gray-700 leading-relaxed">
              Die "Housnkuh" ist eines der bedeutendsten Symbole der Kronacher Geschichte. Während des 
              Dreißigjährigen Krieges versuchten schwedische Truppen, die Stadt durch eine Belagerung zur 
              Aufgabe zu zwingen. Ihr Plan war es, die Festung Rosenberg und die Stadt auszuhungern.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Die Kronacher aber überlisteten die Belagerer: Sie zeigten den Schweden demonstrativ einen 
              wohlgenährten Hasen – die sogenannte "Housnkuh" – auf den Festungsmauern. Diese List 
              suggerierte den Feinden, dass die Stadt noch über reichlich Nahrungsvorräte verfügte.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Wie die historische Housnkuh für den Einfallsreichtum und Zusammenhalt der Kronacher steht, 
              so steht unser Marktplatz für Innovation und die Stärke unserer regionalen Gemeinschaft.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const HomePage: React.FC = () => {
  const features = [
    {
      icon: Clock,
      title: "Fast durchgehend Einkaufen",
      description: "Dank modernster Selbstbedienungstechnologie können Sie einkaufen, wann es Ihnen passt."
    },
    {
      icon: MapPin,
      title: "100% Regional",
      description: "Entdecken Sie die Vielfalt unserer Region – direkt von lokalen Erzeugern zu Ihnen."
    },
    {
      icon: Heart,
      title: "Heimat im Herzen",
      description: "Unterstützen Sie lokale Produzenten und genießen Sie die Qualität aus Ihrer Region."
    }
  ];

  const controlsWelcome = useAnimation();
  const [refWelcome, inViewWelcome] = useInView({ threshold: 0.2, triggerOnce: true });

  useEffect(() => {
    if (inViewWelcome) {
      controlsWelcome.start({
        y: 0,
        opacity: 1,
        transition: { duration: 0.8 }
      });
    }
  }, [controlsWelcome, inViewWelcome]);

  return (
    <div className="space-y-16 pb-20">
      {/* Willkommensbereich - kommt direkt nach dem Hero mit mehr Abstand */}
      <section className="relative pt-24 pb-12">
        <motion.div 
          ref={refWelcome}
          initial={{ y: 30, opacity: 0 }}
          animate={controlsWelcome}
          className="max-w-4xl mx-auto px-6 text-center"
        >
          <div className="backdrop-blur-md bg-white/40 rounded-xl p-8 border border-white/30 shadow-lg">
            <h2 className="text-3xl font-bold text-secondary mb-6">Was ist housnkuh?</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              housnkuh wird Ihr neuer Lieblingsort für regionale Spezialitäten und Produkte aus Kronach und Umgebung. 
              Im modern gestalteten Laden in der Strauer Straße 15 werden lokale Erzeuger und 
              Genießer zusammengebracht – und das beinahe rund um die Uhr!
            </p>
          </div>
        </motion.div>
      </section>
      
      
      {/* Construction Banner einfügen */}
      <ConstructionBanner />

      {/* ConceptGraphic-Komponente */}
      <ConceptGraphic />
      
      {/* Features mit Glaseffekt */}
      <section className="relative py-20 overflow-hidden">
        {/* Hintergrund */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gray-100 to-gray-200"></div>
        
        {/* Dekorative Elemente */}
        <div className="absolute top-0 right-0 -z-5 transform translate-x-1/3 -translate-y-1/4">
          <svg width="404" height="404" fill="none" viewBox="0 0 404 404" aria-hidden="true">
            <defs>
              <pattern id="pattern-circles" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="var(--primary)" opacity="0.15" />
              </pattern>
            </defs>
            <rect width="404" height="404" fill="url(#pattern-circles)" />
          </svg>
        </div>
        
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary mb-4">Was housnkuh einzigartig macht</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Entdecken Sie die Vorteile unseres innovativen Marktplatzkonzepts für regionale Produkte
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} delay={index} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Instagram Feed einbinden */}
      <InstagramFeed />
      
      {/* Geschichte hinter dem Namen */}
      <HistorySection />

      {/* Coming Soon mit Glaseffekt */}
      <section className="relative py-16 overflow-hidden">
        {/* Hintergrund */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-gray-50 to-white"></div>
        
        {/* Dekorative Elemente */}
        <div className="absolute bottom-0 left-0 -z-5 transform -translate-x-1/4">
          <svg width="404" height="404" fill="none" viewBox="0 0 404 404" aria-hidden="true">
            <defs>
              <pattern id="pattern-squares" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect x="3" y="3" width="14" height="14" rx="2" fill="var(--secondary)" opacity="0.08" />
              </pattern>
            </defs>
            <rect width="404" height="404" fill="url(#pattern-squares)" />
          </svg>
        </div>
        
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-secondary mb-8 text-center">Das erwartet Sie</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="backdrop-blur-md bg-white/30 rounded-xl border border-white/40 p-8 shadow-lg">
              <h3 className="text-xl font-semibold text-secondary mb-6">Für Kunden</h3>
              <ul className="space-y-3">
                <AnimatedListItem icon={ShoppingBag} delay={0}>
                  Regionale Spezialitäten fast rund um die Uhr
                </AnimatedListItem>
                <AnimatedListItem icon={MapPin} delay={1}>
                  Zentrale Lage in der Strauer Straße 15
                </AnimatedListItem>
                <AnimatedListItem icon={Heart} delay={2}>
                  Direkter Kontakt zu lokalen Erzeugern
                </AnimatedListItem>
              </ul>
            </div>

            <div className="backdrop-blur-md bg-white/30 rounded-xl border border-white/40 p-8 shadow-lg">
              <h3 className="text-xl font-semibold text-secondary mb-6">Für Direktvermarkter</h3>
              <ul className="space-y-3">
                <AnimatedListItem icon={Users} delay={0}>
                  Erreichen Sie neue Kundengruppen
                </AnimatedListItem>
                <AnimatedListItem icon={Clock} delay={1}>
                  Verkaufen Sie fast rund um die Uhr
                </AnimatedListItem>
                <AnimatedListItem icon={Calendar} delay={2}>
                  Flexible Mietmodelle & faire Konditionen
                </AnimatedListItem>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup mit Glaseffekt - behalte hier den dunkleren Effekt für mehr Kontrast */}
      <section className="max-w-2xl mx-auto px-6">
        <div className="backdrop-blur-lg bg-secondary/95 text-white rounded-2xl p-8 border border-white/10 shadow-2xl">
          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
};

export default HomePage;