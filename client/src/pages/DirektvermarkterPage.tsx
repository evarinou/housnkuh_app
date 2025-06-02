// client/src/pages/DirektvermarkterPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Users, Map, Search } from 'lucide-react';

const DirektvermarkterPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Hauptüberschrift */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Direktvermarkter bei housnkuh</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Entdecken Sie lokale Anbieter hochwertiger Produkte aus der Region und erleben Sie Frische und Qualität direkt vom Erzeuger.
          </p>
        </div>
        
        {/* Hero-Bereich */}
        <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl overflow-hidden shadow-xl mb-16">
          <div className="md:flex">
            <div className="md:w-1/2 p-8 md:p-12 text-white">
              <h2 className="text-3xl font-bold mb-4">Alle Direktvermarkter auf einen Blick</h2>
              <p className="mb-6 text-white/90">
                Durchsuchen Sie unsere umfangreiche Liste von Direktvermarktern, filtern Sie nach Produktkategorien oder Standorten und finden Sie genau das, wonach Sie suchen.
              </p>
              <Link 
                to="/direktvermarkter/uebersicht" 
                className="inline-flex items-center px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Zur Übersicht
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
            <div className="md:w-1/2 bg-gray-200">
              <img
                src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80"
                alt="Frische Produkte vom Direktvermarkter"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
              <ShoppingBag className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Regionale Produkte</h3>
            <p className="text-gray-600 mb-4">
              Entdecken Sie frische und hochwertige Produkte direkt vom Erzeuger. Unterstützen Sie lokale Landwirte und genießen Sie den authentischen Geschmack regionaler Spezialitäten.
            </p>
            <Link to="/direktvermarkter/uebersicht" className="text-primary font-medium hover:underline inline-flex items-center">
              Produkte entdecken
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Unsere Direktvermarkter</h3>
            <p className="text-gray-600 mb-4">
              Lernen Sie die Menschen hinter den Produkten kennen. Wir stellen Ihnen engagierte Direktvermarkter vor, die mit Leidenschaft und Expertise ihre Produkte anbieten.
            </p>
            <Link to="/direktvermarkter/uebersicht" className="text-primary font-medium hover:underline inline-flex items-center">
              Direktvermarkter kennenlernen
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
              <Map className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Auf der Karte finden</h3>
            <p className="text-gray-600 mb-4">
              Finden Sie Direktvermarkter in Ihrer Nähe auf einer interaktiven Karte oder informieren Sie sich über unseren housnkuh-Standort in Kronach.
            </p>
            <div className="space-y-2">
              <Link to="/direktvermarkter/karte" className="text-primary font-medium hover:underline inline-flex items-center">
                Direktvermarkter auf Karte anzeigen
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
              <div>
                <Link to="/standort" className="text-primary font-medium hover:underline inline-flex items-center">
                  housnkuh-Standort anzeigen
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
              <Search className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Gezielt suchen</h3>
            <p className="text-gray-600 mb-4">
              Sie suchen etwas Bestimmtes? Nutzen Sie unsere Filter-Funktion, um nach Produktkategorien, Standorten oder anderen Kriterien zu suchen und genau das zu finden, was Sie brauchen.
            </p>
            <Link to="/direktvermarkter/uebersicht" className="text-primary font-medium hover:underline inline-flex items-center">
              Jetzt suchen
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
        
        {/* Call-to-Action */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Sind Sie Direktvermarkter?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Möchten Sie Ihre Produkte bei housnkuh anbieten? Registrieren Sie sich als Direktvermarkter und profitieren Sie von unserer Plattform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/vendor/login" 
              className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors"
            >
              Als Direktvermarkter anmelden
            </Link>
            <Link 
              to="/mieten" 
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Mehr über Mietfächer erfahren
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirektvermarkterPage;