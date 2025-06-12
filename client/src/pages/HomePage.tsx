import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import NewsletterSignup from '../components/NewsletterSignup';
import ConceptGraphic from '../components/ConceptGraphic';
import InstagramFeed from '../components/InstagramFeed';



// History Section mit Standard-Background
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
    <section className="py-12">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div 
          ref={ref}
          initial={{ y: 60, opacity: 0 }}
          animate={controls}
          className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
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


  return (
    <div className="space-y-12 pb-20">
      
      {/* ConceptGraphic-Komponente - direkt nach dem Hero */}
      <section className="pt-8">
        <ConceptGraphic />
      </section>
      
      
      {/* Instagram Feed einbinden */}
      <InstagramFeed />
      
      {/* Geschichte hinter dem Namen */}
      <HistorySection />


      {/* Newsletter Signup mit Glaseffekt - behalte hier den dunkleren Effekt für mehr Kontrast */}
      <section className="max-w-3xl mx-auto px-6 pt-8">
        <div className="backdrop-blur-lg bg-gradient-to-r from-secondary/95 to-primary/95 text-white rounded-3xl p-10 border border-white/20 shadow-2xl transform transition-all duration-500 hover:shadow-3xl hover:scale-[1.02]">
          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
};

export default HomePage;