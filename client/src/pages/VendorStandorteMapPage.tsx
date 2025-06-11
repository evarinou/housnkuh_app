// client/src/pages/VendorStandorteMapPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, Phone, Info, ArrowLeft, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import axios from 'axios';
import SimpleMapComponent from '../components/SimpleMapComponent';

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
        // API-Aufruf für Standort-Daten (wenn verfügbar)
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
          const response = await axios.get(`${apiUrl}/standorte`);
          if (response.data && response.data.success) {
            setStandorte(response.data.data || []);
          } else {
            setStandorte([]);
          }
        } catch (apiError) {
          console.warn('API nicht verfügbar, keine Standort-Daten:', apiError);
          setStandorte([]);
        }
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
  
  // Calculate map center based on all standorte or selected standort
  const getMapCenter = () => {
    if (selectedStandort) {
      return {
        lat: selectedStandort.koordinaten.lat,
        lng: selectedStandort.koordinaten.lng
      };
    }
    
    if (filteredStandorte.length > 0) {
      const avgLat = filteredStandorte.reduce((sum, s) => sum + s.koordinaten.lat, 0) / filteredStandorte.length;
      const avgLng = filteredStandorte.reduce((sum, s) => sum + s.koordinaten.lng, 0) / filteredStandorte.length;
      return { lat: avgLat, lng: avgLng };
    }
    
    // Default center for Germany
    return { lat: 51.1657, lng: 10.4515 };
  };

  // Get zoom level based on selection
  const getMapZoom = () => {
    if (selectedStandort) {
      return 15; // Close zoom for selected standort
    }
    
    if (filteredStandorte.length === 0) {
      return 6; // Country-wide view
    }
    
    if (filteredStandorte.length === 1) {
      return 13; // Close view for single standort
    }
    
    return 10; // Regional view for multiple standorte
  };

  // Convert standorte to markers for the map
  const getStandortMarkers = () => {
    return filteredStandorte.map(standort => ({
      id: standort.id,
      position: standort.koordinaten,
      title: standort.name,
      description: `${standort.ort} • ${standort.kategorien.slice(0, 2).join(', ')}${standort.kategorien.length > 2 ? '...' : ''}`
    }));
  };

  // Handle marker click to select standort
  const handleMarkerClick = (marker: any) => {
    const standort = filteredStandorte.find(s => s.id === marker.id);
    if (standort) {
      setSelectedStandort(standort);
    }
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
          <div className="bg-white rounded-lg shadow-md overflow-hidden h-[600px] relative">
            <SimpleMapComponent
              center={getMapCenter()}
              zoom={getMapZoom()}
              markers={getStandortMarkers()}
              onMarkerClick={handleMarkerClick}
              showPopups={true}
              selectedMarkerId={selectedStandort?.id}
              fitBounds={!selectedStandort && filteredStandorte.length > 1}
              className="h-full w-full"
            />
            
            {/* Show All Standorte Button - only when a standort is selected */}
            {selectedStandort && filteredStandorte.length > 1 && (
              <button
                onClick={() => setSelectedStandort(null)}
                className="absolute top-4 left-4 bg-white shadow-md hover:shadow-lg px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 transition-all z-10"
              >
                Alle anzeigen
              </button>
            )}
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