// client/src/pages/DirektvermarkterMapPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Phone, Mail, ExternalLink, ArrowLeft, ChevronDown, ChevronUp, Filter } from 'lucide-react';

// Typen für die Direktvermarkter-Daten
interface LocationCoordinates {
  lat: number;
  lng: number;
}

interface Direktvermarkter {
  id: string;
  name: string;
  unternehmen: string;
  profilBild: string;
  telefon: string;
  email: string;
  adresse: {
    strasse: string;
    hausnummer: string;
    plz: string;
    ort: string;
  };
  koordinaten: LocationCoordinates;
  kategorien: string[];
  beschreibung: string;
  website: string;
}

const DirektvermarkterMapPage: React.FC = () => {
  // State für Direktvermarkter und Filter
  const [direktvermarkter, setDirektvermarkter] = useState<Direktvermarkter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategorien, setSelectedKategorien] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Direktvermarkter | null>(null);
  
  // Verfügbare Kategorien für Filter
  const verfuegbareKategorien = [
    'Obst & Gemüse',
    'Fleisch & Wurst',
    'Milchprodukte',
    'Backwaren',
    'Honig',
    'Eier',
    'Wein & Spirituosen',
    'Marmeladen',
    'Gewürze & Kräuter',
    'Öle & Essige',
    'Säfte',
    'Tee',
    'Nüsse & Trockenfrüchte',
    'Handwerksprodukte'
  ];
  
  // Laden der Direktvermarkter-Daten
  useEffect(() => {
    const fetchDirektvermarkter = async () => {
      try {
        // In einer produktiven Umgebung würde hier ein API-Aufruf erfolgen
        // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        // const response = await axios.get(`${apiUrl}/direktvermarkter`);
        // setDirektvermarkter(response.data);
        
        // Mock-Daten für die Entwicklung
        const mockData: Direktvermarkter[] = [
          {
            id: '1',
            name: 'Max Mustermann',
            unternehmen: 'Musterhof',
            profilBild: 'https://images.unsplash.com/photo-1519748771451-a94c596fon67?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80',
            telefon: '01234 / 56789',
            email: 'max@musterhof.de',
            adresse: {
              strasse: 'Musterstraße',
              hausnummer: '123',
              plz: '96317',
              ort: 'Kronach'
            },
            koordinaten: { lat: 50.251120, lng: 11.337709 },
            kategorien: ['Obst & Gemüse', 'Honig', 'Marmeladen'],
            beschreibung: 'Wir sind ein Familienbetrieb in der 3. Generation und produzieren nachhaltige Produkte aus der Region für die Region.',
            website: 'www.musterhof.de'
          },
          {
            id: '2',
            name: 'Anna Schmidt',
            unternehmen: 'Schmidts Bauernhof',
            profilBild: 'https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80',
            telefon: '09876 / 54321',
            email: 'anna@schmidts-bauernhof.de',
            adresse: {
              strasse: 'Dorfstraße',
              hausnummer: '45',
              plz: '96215',
              ort: 'Lichtenfels'
            },
            koordinaten: { lat: 50.152395, lng: 11.065330 },
            kategorien: ['Fleisch & Wurst', 'Eier', 'Milchprodukte'],
            beschreibung: 'Unser Hof bietet eine große Auswahl an selbst angebauten Produkten. Wir legen großen Wert auf Qualität und Nachhaltigkeit.',
            website: 'www.schmidts-bauernhof.de'
          },
          {
            id: '3',
            name: 'Peter Meyer',
            unternehmen: 'Meyers Imkerei',
            profilBild: 'https://images.unsplash.com/photo-1571506165871-ee72a35bc9d4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80',
            telefon: '01111 / 22222',
            email: 'peter@meyers-imkerei.de',
            adresse: {
              strasse: 'Bienenweg',
              hausnummer: '7',
              plz: '96450',
              ort: 'Coburg'
            },
            koordinaten: { lat: 50.271940, lng: 10.962679 },
            kategorien: ['Honig', 'Marmeladen'],
            beschreibung: 'Wir produzieren seit über 30 Jahren lokalen Honig und andere Bienenprodukte.',
            website: 'www.meyers-imkerei.de'
          },
          {
            id: '4',
            name: 'Claudia Wagner',
            unternehmen: 'Wagners Hofladen',
            profilBild: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80',
            telefon: '03333 / 44444',
            email: 'claudia@wagners-hofladen.de',
            adresse: {
              strasse: 'Landstraße',
              hausnummer: '15',
              plz: '96049',
              ort: 'Bamberg'
            },
            koordinaten: { lat: 49.901659, lng: 10.887770 },
            kategorien: ['Obst & Gemüse', 'Backwaren', 'Säfte', 'Milchprodukte', 'Eier'],
            beschreibung: 'Unser Hofladen bietet eine Vielfalt an Bio-Produkten direkt vom Bauernhof.',
            website: 'www.wagners-hofladen.de'
          },
          {
            id: '5',
            name: 'Franz Huber',
            unternehmen: 'Hubers Weingut',
            profilBild: 'https://images.unsplash.com/photo-1559519529-0936e4058364?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80',
            telefon: '05555 / 66666',
            email: 'franz@hubers-weingut.de',
            adresse: {
              strasse: 'Weinbergstraße',
              hausnummer: '42',
              plz: '97209',
              ort: 'Veitshöchheim'
            },
            koordinaten: { lat: 49.839500, lng: 9.871740 },
            kategorien: ['Wein & Spirituosen', 'Säfte'],
            beschreibung: 'Feinste Weine aus Franken, mit Liebe und Leidenschaft hergestellt.',
            website: 'www.hubers-weingut.de'
          }
        ];
        
        setDirektvermarkter(mockData);
        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden der Direktvermarkter:', err);
        setError('Die Daten konnten nicht geladen werden.');
        setLoading(false);
      }
    };
    
    fetchDirektvermarkter();
  }, []);
  
  // Filtern der Direktvermarkter basierend auf Suchbegriff und Kategorien
  const filteredVendors = direktvermarkter.filter(vendor => {
    // Namens- oder Unternehmenssuche
    const searchMatch = 
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.unternehmen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.adresse.ort.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Kategorienfilter
    const kategorieMatch = 
      selectedKategorien.length === 0 || 
      selectedKategorien.some(kat => vendor.kategorien.includes(kat));
    
    return searchMatch && kategorieMatch;
  });
  
  // Kategorie-Toggle-Handler
  const handleKategorieToggle = (kategorie: string) => {
    setSelectedKategorien(prev => {
      if (prev.includes(kategorie)) {
        return prev.filter(k => k !== kategorie);
      } else {
        return [...prev, kategorie];
      }
    });
  };
  
  // Direktvermarkter auswählen für Details
  const handleVendorSelect = (vendor: Direktvermarkter) => {
    setSelectedVendor(vendor);
  };
  
  // OpenStreetMap URL mit Markern für alle Direktvermarkter generieren
  const generateOSMUrl = () => {
    // Basis-URL für den iframe
    let baseUrl = "https://www.openstreetmap.org/export/embed.html?bbox=";
    
    // Berechnung der Bounding Box für alle Direktvermarkter
    if (filteredVendors.length > 0) {
      let minLat = Math.min(...filteredVendors.map(v => v.koordinaten.lat));
      let maxLat = Math.max(...filteredVendors.map(v => v.koordinaten.lat));
      let minLng = Math.min(...filteredVendors.map(v => v.koordinaten.lng));
      let maxLng = Math.max(...filteredVendors.map(v => v.koordinaten.lng));
      
      // Füge etwas Padding hinzu
      const padding = 0.1;
      minLat -= padding;
      maxLat += padding;
      minLng -= padding;
      maxLng += padding;
      
      // Bounding Box
      baseUrl += `${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik`;
    } else {
      // Fallback für ganz Deutschland
      baseUrl += "5.866%2C47.270%2C15.042%2C55.099&layer=mapnik";
    }
    
    // Wenn ein Direktvermarkter ausgewählt ist, auf diesen fokussieren
    if (selectedVendor) {
      baseUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${selectedVendor.koordinaten.lng - 0.01}%2C${selectedVendor.koordinaten.lat - 0.01}%2C${selectedVendor.koordinaten.lng + 0.01}%2C${selectedVendor.koordinaten.lat + 0.01}&layer=mapnik&marker=${selectedVendor.koordinaten.lat}%2C${selectedVendor.koordinaten.lng}`;
    }
    
    return baseUrl;
  };
  
  // Link zur Detailseite generieren
  const getVendorDetailUrl = (vendor: Direktvermarkter) => {
    return `/direktvermarkter/${vendor.id}`;
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-lg text-gray-600">Lade Direktvermarkter...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Link to="/direktvermarkter/uebersicht" className="inline-flex items-center text-primary hover:text-primary-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Zurück zur Übersicht</span>
        </Link>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Direktvermarkter auf der Karte</h1>
        <p className="text-lg text-gray-600">
          Finden Sie alle Direktvermarkter in der Region auf einer interaktiven Karte und entdecken Sie, wo Sie frische, lokale Produkte direkt vom Erzeuger bekommen können.
        </p>
      </div>
      
      {/* Filter und Suchbereich */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Direktvermarkter oder Ort suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>
        </div>
        
        {showFilters && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Nach Kategorie filtern:</h3>
            <div className="flex flex-wrap gap-2">
              {verfuegbareKategorien.map(kategorie => (
                <button
                  key={kategorie}
                  onClick={() => handleKategorieToggle(kategorie)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    selectedKategorien.includes(kategorie)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {kategorie}
                </button>
              ))}
              
              {selectedKategorien.length > 0 && (
                <button
                  onClick={() => setSelectedKategorien([])}
                  className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Alle zurücksetzen
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Direktvermarkter-Liste */}
        <div className="lg:col-span-1 h-[600px] overflow-y-auto pr-2 bg-white rounded-lg shadow-md">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="font-medium">
              {filteredVendors.length} Direktvermarkter gefunden
            </h2>
          </div>
          
          <ul className="divide-y">
            {filteredVendors.map(vendor => (
              <li key={vendor.id}>
                <button
                  onClick={() => handleVendorSelect(vendor)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedVendor?.id === vendor.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start">
                    {vendor.profilBild && (
                      <img 
                        src={vendor.profilBild} 
                        alt={vendor.unternehmen}
                        className="w-14 h-14 rounded-full object-cover flex-shrink-0 mr-3"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{vendor.unternehmen}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {vendor.adresse.ort}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {vendor.kategorien.slice(0, 3).map(kat => (
                          <span key={kat} className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                            {kat}
                          </span>
                        ))}
                        {vendor.kategorien.length > 3 && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{vendor.kategorien.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
            
            {filteredVendors.length === 0 && (
              <li className="p-6 text-center text-gray-500">
                Keine Direktvermarkter gefunden, die Ihren Filterkriterien entsprechen.
              </li>
            )}
          </ul>
        </div>
        
        {/* Karte */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden h-[600px]">
            <iframe 
              src={generateOSMUrl()}
              style={{ width: '100%', height: '100%', border: 0 }}
              allowFullScreen
              aria-hidden="false"
              title="Direktvermarkter Karte"
            ></iframe>
          </div>
        </div>
      </div>
      
      {/* Direktvermarkter-Details */}
      {selectedVendor && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start gap-4">
            {selectedVendor.profilBild && (
              <img 
                src={selectedVendor.profilBild} 
                alt={selectedVendor.unternehmen}
                className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedVendor.unternehmen}</h2>
                  <p className="text-gray-700">{selectedVendor.name}</p>
                  <p className="text-gray-600 mt-1">
                    {selectedVendor.adresse.strasse} {selectedVendor.adresse.hausnummer}, {selectedVendor.adresse.plz} {selectedVendor.adresse.ort}
                  </p>
                </div>
                <Link
                  to={getVendorDetailUrl(selectedVendor)}
                  className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors"
                >
                  Profil ansehen
                </Link>
              </div>
              
              <div className="mt-4 text-gray-700">{selectedVendor.beschreibung}</div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center mb-2">
                <Phone className="w-4 h-4 mr-2 text-primary" />
                Telefon
              </h3>
              <p>{selectedVendor.telefon}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center mb-2">
                <Mail className="w-4 h-4 mr-2 text-primary" />
                E-Mail
              </h3>
              <a href={`mailto:${selectedVendor.email}`} className="text-primary hover:underline">
                {selectedVendor.email}
              </a>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center mb-2">
                <ExternalLink className="w-4 h-4 mr-2 text-primary" />
                Website
              </h3>
              <a 
                href={`https://${selectedVendor.website}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {selectedVendor.website}
              </a>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-2">Kategorien</h3>
            <div className="flex flex-wrap gap-2">
              {selectedVendor.kategorien.map(kat => (
                <span key={kat} className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                  {kat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirektvermarkterMapPage;