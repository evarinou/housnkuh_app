// client/src/pages/VendorStandorteMapPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, Phone, Info, ArrowLeft, ChevronDown, ChevronUp, Filter } from 'lucide-react';

// Typen für die Standortdaten
interface LocationCoordinates {
  lat: number;
  lng: number;
}

interface VendorStandort {
  id: string;
  name: string;
  adresse: string;
  plz: string;
  ort: string;
  beschreibung: string;
  telefon: string;
  koordinaten: LocationCoordinates;
  kategorien: string[];
  direktvermarkter: string[];
  aktiviert: boolean;
}

const VendorStandorteMapPage: React.FC = () => {
  // State für Standorte und Filter
  const [standorte, setStandorte] = useState<VendorStandort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategorien, setSelectedKategorien] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStandort, setSelectedStandort] = useState<VendorStandort | null>(null);
  
  // Verfügbare Kategorien für Filter
  const verfuegbareKategorien = [
    'Kühlschrank',
    'Tiefkühlung',
    'Frische Produkte',
    'Haltbare Waren',
    'Getränke',
    'Handwerksprodukte'
  ];
  
  // Laden der Standortdaten
  useEffect(() => {
    const fetchStandorte = async () => {
      try {
        // In einer produktiven Umgebung würde hier ein API-Aufruf erfolgen
        // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        // const response = await axios.get(`${apiUrl}/standorte`);
        // setStandorte(response.data);
        
        // Mock-Daten für die Entwicklung
        const mockData: VendorStandort[] = [
          {
            id: '1',
            name: 'housnkuh Kronach',
            adresse: 'Strauer Str. 15',
            plz: '96317',
            ort: 'Kronach',
            beschreibung: 'Hauptstandort mit vielfältigem Angebot von lokalen Direktvermarktern. Rund um die Uhr geöffnet mit Zugang per EC- oder Kreditkarte.',
            telefon: '0157 35711257',
            koordinaten: { lat: 50.241120, lng: 11.327709 },
            kategorien: ['Kühlschrank', 'Tiefkühlung', 'Frische Produkte', 'Haltbare Waren', 'Getränke'],
            direktvermarkter: ['Musterhof', 'Schmidts Bauernhof', 'Meyers Imkerei'],
            aktiviert: true
          },
          {
            id: '2',
            name: 'housnkuh Kulmbach',
            adresse: 'Marktplatz 3',
            plz: '95326',
            ort: 'Kulmbach',
            beschreibung: 'Zentral am Marktplatz gelegen, bietet dieser Standort hauptsächlich Getränke und haltbare Waren an.',
            telefon: '0157 36781234',
            koordinaten: { lat: 50.102395, lng: 11.445330 },
            kategorien: ['Haltbare Waren', 'Getränke', 'Handwerksprodukte'],
            direktvermarkter: ['Schmidts Bauernhof', 'Wagners Hofladen'],
            aktiviert: true
          },
          {
            id: '3',
            name: 'housnkuh Lichtenfels',
            adresse: 'Coburger Str. 28',
            plz: '96215',
            ort: 'Lichtenfels',
            beschreibung: 'Unser neuester Standort mit spezialisiertem Sortiment und besonderen Angeboten für Handwerksprodukte.',
            telefon: '0157 36781235',
            koordinaten: { lat: 50.144096, lng: 11.061096 },
            kategorien: ['Kühlschrank', 'Frische Produkte', 'Handwerksprodukte'],
            direktvermarkter: ['Schmidts Bauernhof'],
            aktiviert: true
          },
          {
            id: '4',
            name: 'housnkuh Coburg',
            adresse: 'Markt 2',
            plz: '96450',
            ort: 'Coburg',
            beschreibung: 'In der Innenstadt von Coburg gelegen, bietet dieser Standort ein breites Sortiment aus der Region.',
            telefon: '0157 36781236',
            koordinaten: { lat: 50.261940, lng: 10.962679 },
            kategorien: ['Kühlschrank', 'Tiefkühlung', 'Frische Produkte', 'Haltbare Waren'],
            direktvermarkter: ['Meyers Imkerei', 'Wagners Hofladen'],
            aktiviert: true
          },
          {
            id: '5',
            name: 'housnkuh Bamberg',
            adresse: 'Obstmarkt 5',
            plz: '96047',
            ort: 'Bamberg',
            beschreibung: 'Mitten in der Altstadt gelegen, mit Fokus auf Frische und Delikatessen aus der Region.',
            telefon: '0157 36781237',
            koordinaten: { lat: 49.891659, lng: 10.887770 },
            kategorien: ['Frische Produkte', 'Haltbare Waren', 'Getränke', 'Handwerksprodukte'],
            direktvermarkter: ['Musterhof', 'Meyers Imkerei', 'Wagners Hofladen'],
            aktiviert: true
          }
        ];
        
        setStandorte(mockData);
        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden der Standorte:', err);
        setError('Die Standortdaten konnten nicht geladen werden.');
        setLoading(false);
      }
    };
    
    fetchStandorte();
  }, []);
  
  // Filtern der Standorte basierend auf Suchbegriff und Kategorien
  const filteredStandorte = standorte.filter(standort => {
    // Namens- oder Ortssuche
    const searchMatch = 
      standort.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      standort.ort.toLowerCase().includes(searchTerm.toLowerCase()) ||
      standort.adresse.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Kategorienfilter
    const kategorieMatch = 
      selectedKategorien.length === 0 || 
      selectedKategorien.some(kat => standort.kategorien.includes(kat));
    
    return searchMatch && kategorieMatch && standort.aktiviert;
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
  
  // Standort auswählen für Details
  const handleStandortSelect = (standort: VendorStandort) => {
    setSelectedStandort(standort);
  };
  
  // OpenStreetMap URL mit Markern für alle Standorte generieren
  const generateOSMUrl = () => {
    // Basis-URL für den iframe
    let baseUrl = "https://www.openstreetmap.org/export/embed.html?bbox=";
    
    // Berechnung der Bounding Box für alle Standorte
    if (filteredStandorte.length > 0) {
      let minLat = Math.min(...filteredStandorte.map(s => s.koordinaten.lat));
      let maxLat = Math.max(...filteredStandorte.map(s => s.koordinaten.lat));
      let minLng = Math.min(...filteredStandorte.map(s => s.koordinaten.lng));
      let maxLng = Math.max(...filteredStandorte.map(s => s.koordinaten.lng));
      
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
    
    // Wenn ein Standort ausgewählt ist, auf diesen fokussieren
    if (selectedStandort) {
      baseUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${selectedStandort.koordinaten.lng - 0.01}%2C${selectedStandort.koordinaten.lat - 0.01}%2C${selectedStandort.koordinaten.lng + 0.01}%2C${selectedStandort.koordinaten.lat + 0.01}&layer=mapnik&marker=${selectedStandort.koordinaten.lat}%2C${selectedStandort.koordinaten.lng}`;
    }
    
    return baseUrl;
  };
  
  // Link zur Detailseite generieren
  const getStandortDetailUrl = (standort: VendorStandort) => {
    return `/standort/${standort.id}`;
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-lg text-gray-600">Lade Standorte...</span>
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
        <Link to="/direktvermarkter" className="inline-flex items-center text-primary hover:text-primary-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Zurück zur Übersicht</span>
        </Link>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">housnkuh Standorte</h1>
        <p className="text-lg text-gray-600">
          Entdecken Sie unsere Standorte in der Region, an denen Sie Produkte lokaler Direktvermarkter finden können.
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
              placeholder="Standort suchen..."
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
        {/* Standortliste */}
        <div className="lg:col-span-1 h-[600px] overflow-y-auto pr-2 bg-white rounded-lg shadow-md">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="font-medium">
              {filteredStandorte.length} Standort{filteredStandorte.length !== 1 ? 'e' : ''} gefunden
            </h2>
          </div>
          
          <ul className="divide-y">
            {filteredStandorte.map(standort => (
              <li key={standort.id}>
                <button
                  onClick={() => handleStandortSelect(standort)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedStandort?.id === standort.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                  }`}
                >
                  <h3 className="font-semibold text-gray-900">{standort.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {standort.adresse}, {standort.plz} {standort.ort}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {standort.kategorien.slice(0, 3).map(kat => (
                      <span key={kat} className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {kat}
                      </span>
                    ))}
                    {standort.kategorien.length > 3 && (
                      <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        +{standort.kategorien.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
            
            {filteredStandorte.length === 0 && (
              <li className="p-6 text-center text-gray-500">
                Keine Standorte gefunden, die Ihren Filterkriterien entsprechen.
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
              title="Standorte Karte"
            ></iframe>
          </div>
        </div>
      </div>
      
      {/* Standort-Details */}
      {selectedStandort && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedStandort.name}</h2>
              <p className="text-gray-600 mt-1">
                {selectedStandort.adresse}, {selectedStandort.plz} {selectedStandort.ort}
              </p>
            </div>
            <Link
              to={getStandortDetailUrl(selectedStandort)}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors"
            >
              Details ansehen
            </Link>
          </div>
          
          <div className="mt-4 text-gray-700">{selectedStandort.beschreibung}</div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center mb-2">
                <Phone className="w-4 h-4 mr-2 text-primary" />
                Kontakt
              </h3>
              <p>{selectedStandort.telefon}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center mb-2">
                <Info className="w-4 h-4 mr-2 text-primary" />
                Verfügbare Kategorien
              </h3>
              <div className="flex flex-wrap gap-1">
                {selectedStandort.kategorien.map(kat => (
                  <span key={kat} className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                    {kat}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-2">Verfügbare Direktvermarkter</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {selectedStandort.direktvermarkter.map(dv => (
                <li key={dv} className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                  <span>{dv}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorStandorteMapPage;