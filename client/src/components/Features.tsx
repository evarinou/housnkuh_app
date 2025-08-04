// src/components/layout/Features.tsx
import React from 'react';
import { Clock, MapPin, Heart, Store, ShoppingBag, Users } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  iconBgColor?: string;
}

// Feature Card Komponente mit Animation und Hover-Effekt
const FeatureCard: React.FC<FeatureCardProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  iconBgColor = 'bg-[var(--primary)]/10' 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className={`${iconBgColor} w-14 h-14 rounded-full flex items-center justify-center mb-4`}>
        <Icon className="w-7 h-7 text-[var(--primary)]" />
      </div>
      <h3 className="text-xl font-semibold mb-3 text-[var(--secondary)]">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

// Hauptkomponente mit gestaffelter Animation
const Features: React.FC = () => {
  const featuresData = [
    {
      icon: Clock,
      title: "24/7 Einkaufen",
      description: "Dank moderner Zutrittskontrolle und Selbstbedienungskassen kannst du rund um die Uhr einkaufen."
    },
    {
      icon: MapPin,
      title: "100% Regional",
      description: "Alle Produkte stammen von Erzeugern aus der Region Kronach und Umgebung."
    },
    {
      icon: Heart,
      title: "Direkt vom Erzeuger",
      description: "Unterstütze lokale Produzenten ohne Zwischenhändler und genieße höchste Qualität."
    },
    {
      icon: Store,
      title: "Zentraler Standort",
      description: "Unser Laden in der Strauer Straße 15 ist optimal erreichbar – mitten in Kronach."
    },
    {
      icon: ShoppingBag,
      title: "Vielfältiges Sortiment",
      description: "Von Lebensmitteln bis zu Handwerksprodukten – entdecke die Vielfalt unserer Region."
    },
    {
      icon: Users,
      title: "Gemeinschaftsprojekt",
      description: "housnkuh verbindet regionale Erzeuger mit bewussten Konsumenten für eine nachhaltige Zukunft."
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[var(--secondary)] mb-4">Was housnkuh einzigartig macht</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Entdecke die Vorteile unseres innovativen Marktplatzkonzepts für regionale Produkte
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresData.map((feature, index) => (
            <div 
              key={index} 
              className={`opacity-0 animate-fadeIn`} 
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
            >
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;