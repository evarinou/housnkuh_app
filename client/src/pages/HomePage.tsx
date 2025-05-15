// client/src/pages/HomePage.tsx
import React from 'react';
import { Calendar, Clock, ShoppingBag, Users, MapPin, Heart } from 'lucide-react';
import NewsletterSignup from '../components/NewsletterSignup';
import ConceptGraphic from '../components/ConceptGraphic';
import ConstructionBanner from '../components/ConstructionBanner';
import InstagramFeed from '../components/InstagramFeed';

// Feature Card Komponente mit Animation
interface FeatureCardProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
      <div className="flex justify-center text-primary mb-4 transition-transform duration-300 hover:scale-110">
        <Icon size={32} className="transform transition-all duration-500 hover:rotate-12" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-secondary">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

// List Item mit Animation
interface AnimatedListItemProps {
  icon: React.ComponentType<any>;
  children: React.ReactNode;
}

const AnimatedListItem: React.FC<AnimatedListItemProps> = ({ icon: Icon, children }) => {
  return (
    <li className="flex items-center transform transition-all duration-300 hover:translate-x-2">
      <Icon className="w-5 h-5 text-primary mr-2" />
      <span>{children}</span>
    </li>
  );
};

// History Section mit verbessertem Design
const HistorySection: React.FC = () => {
  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-8 shadow-lg transform transition-all duration-300 hover:shadow-xl">
        <h2 className="text-3xl font-bold text-secondary mb-6 text-center">
          Die Geschichte hinter dem Namen
        </h2>
        <div className="prose prose-lg mx-auto">
          <p className="text-gray-600 mb-4 leading-relaxed">
            Die "Housnkuh" ist eines der bedeutendsten Symbole der Kronacher Geschichte. Während des 
            Dreißigjährigen Krieges versuchten schwedische Truppen, die Stadt durch eine Belagerung zur 
            Aufgabe zu zwingen. Ihr Plan war es, die Festung Rosenberg und die Stadt auszuhungern.
          </p>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Die Kronacher aber überlisteten die Belagerer: Sie zeigten den Schweden demonstrativ einen 
            wohlgenährten Hasen – die sogenannte "Housnkuh" – auf den Festungsmauern. Diese List 
            suggerierte den Feinden, dass die Stadt noch über reichlich Nahrungsvorräte verfügte.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Wie die historische Housnkuh für den Einfallsreichtum und Zusammenhalt der Kronacher steht, 
            so steht unser Marktplatz für Innovation und die Stärke unserer regionalen Gemeinschaft.
          </p>
        </div>
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

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Section mit Animation */}
      <section className="bg-gradient-to-b from-gray-50 to-white pt-20 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-secondary sm:text-5xl mb-6 animate-slideDown">
              Willkommen bei Housnkuh!
            </h1>
            <p className="text-2xl text-primary font-semibold animate-slideUp">
              Ihr innovativer Marktplatz für regionale Produkte in Kronach
            </p>
            <p className="mt-4 text-xl text-gray-600 animate-fadeIn">
              Eröffnung im Sommer 2025
            </p>
          </div>
        </div>
      </section>

      {/* Construction Banner einfügen */}
      <ConstructionBanner />

      {/* ConceptGraphic-Komponente */}
      <ConceptGraphic />
      
      {/* Concept Explanation mit Animation */}
      <section className="max-w-4xl mx-auto px-4 transform transition-all duration-500 hover:scale-105">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-secondary mb-6">Was ist Housnkuh?</h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Housnkuh wird Ihr neuer Lieblingsort für regionale Spezialitäten und Produkte aus Kronach und Umgebung. 
            Im (bald) modern gestalteten Laden in der Strauer Straße 15 werden lokale Erzeuger und 
            Genießer zusammengebracht – und das beinahe rund um die Uhr!
          </p>
        </div>
      </section>
      
      {/* Instagram Feed einbinden */}
      <InstagramFeed />
      
      {/* Geschichte hinter dem Namen */}
      <HistorySection />

      {/* Key Features mit Animation */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </section>

      {/* Coming Soon mit Animation */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-secondary mb-6">Das erwartet Sie</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-lg shadow-lg transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Für Kunden</h3>
            <ul className="space-y-3">
              <AnimatedListItem icon={ShoppingBag}>
                Regionale Spezialitäten fast rund um die Uhr
              </AnimatedListItem>
              <AnimatedListItem icon={MapPin}>
                Zentrale Lage in der Strauer Straße 15
              </AnimatedListItem>
              <AnimatedListItem icon={Heart}>
                Direkter Kontakt zu lokalen Erzeugern
              </AnimatedListItem>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-lg shadow-lg transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Für Direktvermarkter</h3>
            <ul className="space-y-3">
              <AnimatedListItem icon={Users}>
                Erreichen Sie neue Kundengruppen
              </AnimatedListItem>
              <AnimatedListItem icon={Clock}>
                Verkaufen Sie fast rund um die Uhr
              </AnimatedListItem>
              <AnimatedListItem icon={Calendar}>
                Flexible Mietmodelle & faire Konditionen
              </AnimatedListItem>
            </ul>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="max-w-2xl mx-auto px-4">
        <NewsletterSignup />
      </section>
    </div>
  );
};

export default HomePage;