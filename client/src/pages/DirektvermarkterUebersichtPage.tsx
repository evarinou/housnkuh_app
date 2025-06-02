// client/src/pages/DirektvermarkterUebersichtPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ExternalLink, Filter, Search, Map } from 'lucide-react';
import axios from 'axios';

// Typen für die Daten
interface Mietfach {
  id: string;
  name: string;
  beschreibung: string;
  preis: number;
  groesse: string;
  standort: string;
}

interface Direktvermarkter {
  id: string;
  name: string;
  unternehmen: string;
  beschreibung: string;
  profilBild: string;
  telefon: string;
  email: string;
  adresse: {
    strasse: string;
    hausnummer: string;
    plz: string;
    ort: string;
  };
  kategorien: string[];
  slogan: string;
  website: string;
  socialMedia: {
    facebook: string;
    instagram: string;
  };
  mietfaecher: Mietfach[];
}

const DirektvermarkterUebersichtPage: React.FC = () => {
  const [direktvermarkter, setDirektvermarkter] = useState<Direktvermarkter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter-State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategorien, setSelectedKategorien] = useState<string[]>([]);
  const [selectedStandort, setSelectedStandort] = useState<string>('');
  
  // Verfügbare Kategorien und Standorte
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
  
  // Standorte dynamisch aus den Vendor-Adressen und Mietfächern extrahieren
  const verfuegbareStandorte = React.useMemo(() => {
    const standorte = new Set<string>();
    direktvermarkter.forEach(dv => {
      if (dv.adresse.ort) {
        standorte.add(dv.adresse.ort);
      }
      dv.mietfaecher.forEach(mf => {
        if (mf.standort) {
          standorte.add(mf.standort);
        }
      });
    });
    return Array.from(standorte).sort();
  }, [direktvermarkter]);
  
  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        const response = await axios.get(`${apiUrl}/vendor-auth/public/profiles`);
        
        if (response.data.success) {
          setDirektvermarkter(response.data.vendors);
        } else {
          console.error('API Fehler:', response.data.message);
          setError('Die Direktvermarkter-Daten konnten nicht geladen werden.');
        }
        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err);
        setError('Die Daten konnten nicht geladen werden.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
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
  
  // Filtern der Direktvermarkter
  const filteredDirektvermarkter = direktvermarkter.filter(dv => {
    // Namens- oder Unternehmensuche
    const searchMatch = 
      dv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dv.unternehmen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dv.beschreibung.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Kategorienfilter
    const kategorieMatch = 
      selectedKategorien.length === 0 || 
      selectedKategorien.some(kat => dv.kategorien.includes(kat));
    
    // Standortfilter
    const standortMatch = 
      !selectedStandort || 
      dv.mietfaecher.some(mf => mf.standort === selectedStandort);
    
    return searchMatch && kategorieMatch && standortMatch;
  });
  
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
    <div className="container mx-auto py-12 px-4">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Unsere Direktvermarkter</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
          Entdecken Sie lokale Anbieter hochwertiger Produkte aus der Region und erleben Sie Frische und Qualität direkt vom Erzeuger.
        </p>
        <Link 
          to="/direktvermarkter/karte" 
          className="inline-flex items-center justify-center bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Map className="w-5 h-5 mr-2" />
          Direktvermarkter auf Karte anzeigen
        </Link>
      </div>
      
      {/* Filter-Bereich */}
      <div className="bg-white shadow-md rounded-lg mb-10 p-6">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-primary mr-2" />
          <h2 className="text-lg font-semibold">Filter und Suche</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Suchfeld */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Suche nach Name oder Beschreibung
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                placeholder="Suchbegriff eingeben..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          
          {/* Standort-Auswahl */}
          <div>
            <label htmlFor="standort" className="block text-sm font-medium text-gray-700 mb-1">
              Standort der Mietfächer
            </label>
            <select
              id="standort"
              value={selectedStandort}
              onChange={(e) => setSelectedStandort(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Alle Standorte</option>
              {verfuegbareStandorte.map(standort => (
                <option key={standort} value={standort}>{standort}</option>
              ))}
            </select>
          </div>
          
          {/* Kategorien-Filter (nur mobil) */}
          <div className="md:hidden">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategorien
            </label>
            <select
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  handleKategorieToggle(value);
                }
              }}
            >
              <option value="">Kategorie auswählen...</option>
              {verfuegbareKategorien.map(kategorie => (
                <option key={kategorie} value={kategorie}>
                  {kategorie} {selectedKategorien.includes(kategorie) ? '✓' : ''}
                </option>
              ))}
            </select>
            
            {/* Anzeige der ausgewählten Kategorien */}
            {selectedKategorien.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedKategorien.map(kat => (
                  <span
                    key={kat}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary"
                  >
                    {kat}
                    <button
                      type="button"
                      onClick={() => handleKategorieToggle(kat)}
                      className="ml-1.5 h-3.5 w-3.5 rounded-full inline-flex items-center justify-center text-primary-400 hover:bg-primary-200 hover:text-primary-500 focus:outline-none"
                    >
                      <span className="sr-only">Entfernen</span>
                      <svg className="h-2.5 w-2.5" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                        <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                      </svg>
                    </button>
                  </span>
                ))}
                
                <button
                  type="button"
                  onClick={() => setSelectedKategorien([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Alle zurücksetzen
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Kategorien-Checkboxen (Desktop) */}
        <div className="hidden md:block mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategorien
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2">
            {verfuegbareKategorien.map(kategorie => (
              <div key={kategorie} className="flex items-center">
                <input
                  type="checkbox"
                  id={`kategorie-${kategorie}`}
                  checked={selectedKategorien.includes(kategorie)}
                  onChange={() => handleKategorieToggle(kategorie)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor={`kategorie-${kategorie}`} className="ml-2 block text-sm text-gray-700">
                  {kategorie}
                </label>
              </div>
            ))}
          </div>
          
          {/* Zurücksetzen-Button */}
          {selectedKategorien.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedKategorien([])}
              className="mt-2 text-sm text-primary hover:text-primary-600"
            >
              Alle Kategorien zurücksetzen
            </button>
          )}
        </div>
      </div>
      
      {/* Ergebnisliste */}
      {filteredDirektvermarkter.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          {direktvermarkter.length === 0 ? (
            <div>
              <p className="text-lg text-gray-600 mb-4">
                Derzeit sind noch keine Direktvermarkter registriert.
              </p>
              <p className="text-gray-500 mb-6">
                Die Plattform wird gerade aufgebaut. Schauen Sie bald wieder vorbei oder registrieren Sie sich als Direktvermarkter!
              </p>
              <Link 
                to="/vendor/login" 
                className="inline-block px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                Als Direktvermarkter registrieren
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-lg text-gray-600">Keine Direktvermarkter gefunden, die Ihren Filterkriterien entsprechen.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedKategorien([]);
                  setSelectedStandort('');
                }}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                Filter zurücksetzen
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDirektvermarkter.map(dv => (
            <div key={dv.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <div className="relative h-48 bg-gray-200">
                {dv.profilBild ? (
                  <img 
                    src={dv.profilBild} 
                    alt={dv.unternehmen} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                {/* Kategorien-Badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <div className="flex flex-wrap gap-1">
                    {dv.kategorien.map(kategorie => (
                      <span key={kategorie} className="inline-block px-2 py-1 text-xs text-white bg-primary/80 rounded-full">
                        {kategorie}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-5">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">{dv.unternehmen}</h3>
                <p className="text-sm text-gray-600 italic mb-3">{dv.slogan}</p>
                
                <p className="text-gray-700 mb-4 line-clamp-3" style={{ minHeight: '4.5rem' }}>
                  {dv.beschreibung}
                </p>
                
                <div className="space-y-2 text-sm">
                  {/* Adresse */}
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="ml-2 text-gray-700">
                      {dv.adresse.strasse} {dv.adresse.hausnummer}, {dv.adresse.plz} {dv.adresse.ort}
                    </p>
                  </div>
                  
                  {/* Telefon */}
                  {dv.telefon && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <p className="ml-2 text-gray-700">{dv.telefon}</p>
                    </div>
                  )}
                  
                  {/* Email */}
                  {dv.email && (
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <a href={`mailto:${dv.email}`} className="ml-2 text-primary hover:underline">
                        {dv.email}
                      </a>
                    </div>
                  )}
                  
                  {/* Website */}
                  {dv.website && (
                    <div className="flex items-center">
                      <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <a 
                        href={`https://${dv.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-primary hover:underline"
                      >
                        {dv.website}
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Mietfächer */}
                {dv.mietfaecher && dv.mietfaecher.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Gemietete Fächer:</h4>
                    <div className="space-y-2">
                      {dv.mietfaecher.map(mf => (
                        <div key={mf.id} className="bg-gray-50 p-2 rounded-md border border-gray-200">
                          <p className="text-sm font-medium">{mf.name}</p>
                          <p className="text-xs text-gray-600">{mf.beschreibung}</p>
                          <div className="flex justify-between items-center mt-1 text-xs text-gray-700">
                            <span>Standort: {mf.standort}</span>
                            <span className="font-medium">{mf.preis.toFixed(2)} €/Monat</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Button zum Detail-Profil */}
                <Link 
                  to={`/direktvermarkter/${dv.id}`}
                  className="mt-5 block w-full text-center px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
                >
                  Profil anzeigen
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DirektvermarkterUebersichtPage;