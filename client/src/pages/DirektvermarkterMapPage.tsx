/**
 * @file DirektvermarkterMapPage.tsx
 * @purpose Interactive map page displaying direct marketers (Direktvermarkter) with filtering and location-based search
 * @created 2024-01-01
 * @modified 2025-08-05
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Phone, Mail, ExternalLink, ArrowLeft, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import VendorListPreview from '../components/VendorListPreview';
import SimpleMapComponent from '../components/SimpleMapComponent';

/**
 * Location coordinates interface for direct marketer locations
 * @interface LocationCoordinates
 * @property {number} lat - Latitude coordinate
 * @property {number} lng - Longitude coordinate
 */
interface LocationCoordinates {
  lat: number;
  lng: number;
}

/**
 * Direct marketer (Direktvermarkter) data interface
 * @interface Direktvermarkter
 * @property {string} id - Unique identifier for the direct marketer
 * @property {string} name - Contact person name
 * @property {string} unternehmen - Company/business name
 * @property {string} profilBild - Profile image URL
 * @property {string} telefon - Phone number
 * @property {string} email - Email address
 * @property {object} adresse - Address information
 * @property {string} adresse.strasse - Street name
 * @property {string} adresse.hausnummer - House number
 * @property {string} adresse.plz - Postal code
 * @property {string} adresse.ort - City/town
 * @property {LocationCoordinates} koordinaten - GPS coordinates
 * @property {string[]} kategorien - Product categories offered
 * @property {string} beschreibung - Business description
 * @property {string} website - Website URL
 */
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

/**
 * Interactive map page component for direct marketers
 * @description Displays direct marketers on an interactive map with filtering, search, and detailed information
 * @returns {JSX.Element} Map page with vendor locations, filters, and selection capabilities
 */
const DirektvermarkterMapPage: React.FC = () => {
  // State für Direktvermarkter und Filter
  const [direktvermarkter, setDirektvermarkter] = useState<Direktvermarkter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategorien, setSelectedKategorien] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Direktvermarkter | null>(null);
  const [geocodingProgress, setGeocodingProgress] = useState<{current: number, total: number}>({current: 0, total: 0});
  
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

  /**
   * Geocodes a single address using OpenStreetMap Nominatim API
   * @description Converts a text address to GPS coordinates for map display
   * @param {string} address - Full address string to geocode
   * @returns {Promise<{lat: number, lng: number} | null>} GPS coordinates or null if geocoding fails
   */
  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=de`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding Fehler für:', address, error);
      return null;
    }
  };

  /**
   * Batch geocodes vendors that don't have valid GPS coordinates
   * @description Processes vendors in batches with API rate limiting to avoid overwhelming the geocoding service
   * @param {Direktvermarkter[]} vendors - Array of vendors to process
   * @returns {Promise<Direktvermarkter[]>} Updated vendors array with geocoded coordinates
   */
  const geocodeVendorsInBatches = useCallback(async (vendors: Direktvermarkter[]) => {
    const vendorsNeedingGeocode = vendors.filter(vendor => 
      !vendor.koordinaten || 
      vendor.koordinaten.lat === 0 || 
      vendor.koordinaten.lng === 0 ||
      (vendor.koordinaten.lat === 50.251120 && vendor.koordinaten.lng === 11.337709) // Remove fallback coords
    );

    if (vendorsNeedingGeocode.length === 0) return vendors;

    setGeocodingProgress({current: 0, total: vendorsNeedingGeocode.length});
    const updatedVendors = [...vendors];

    for (let i = 0; i < vendorsNeedingGeocode.length; i++) {
      const vendor = vendorsNeedingGeocode[i];
      const fullAddress = `${vendor.adresse.strasse} ${vendor.adresse.hausnummer}, ${vendor.adresse.plz} ${vendor.adresse.ort}, Deutschland`;
      
      const coords = await geocodeAddress(fullAddress);
      if (coords) {
        const vendorIndex = updatedVendors.findIndex(v => v.id === vendor.id);
        if (vendorIndex >= 0) {
          updatedVendors[vendorIndex] = {
            ...updatedVendors[vendorIndex],
            koordinaten: coords
          };
        }
      }
      
      setGeocodingProgress({current: i + 1, total: vendorsNeedingGeocode.length});
      
      // Small delay to be respectful to the API
      if (i < vendorsNeedingGeocode.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Clear progress after completion
    setTimeout(() => setGeocodingProgress({current: 0, total: 0}), 1000);
    
    return updatedVendors;
  }, []);
  
  // Laden der Direktvermarkter-Daten
  useEffect(() => {
    const fetchDirektvermarkter = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        const response = await fetch(`${apiUrl}/vendor-auth/public/profiles?limit=100`);
        const data = await response.json();
        
        if (data.success && data.vendors) {
          // Transform API data to match component interface
          const vendors = data.vendors.map((vendor: any) => ({
            id: vendor.id,
            name: vendor.name,
            unternehmen: vendor.unternehmen,
            profilBild: vendor.profilBild,
            telefon: vendor.telefon,
            email: vendor.email,
            adresse: vendor.adresse,
            koordinaten: vendor.adresse?.koordinaten || null, // Don't use fallback coords
            kategorien: vendor.kategorien || [],
            beschreibung: vendor.beschreibung,
            website: vendor.website
          }));
          
          setDirektvermarkter(vendors);
          setLoading(false);
          
          // Start geocoding for vendors without coordinates
          const geocodedVendors = await geocodeVendorsInBatches(vendors);
          setDirektvermarkter(geocodedVendors);
        } else {
          setDirektvermarkter([]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Fehler beim Laden der Direktvermarkter:', err);
        setError('Die Daten konnten nicht geladen werden.');
        setLoading(false);
      }
    };
    
    fetchDirektvermarkter();
  }, [geocodeVendorsInBatches]);
  
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
  
  // Calculate map center based on all vendors or selected vendor
  const getMapCenter = () => {
    if (selectedVendor && selectedVendor.koordinaten) {
      return {
        lat: selectedVendor.koordinaten.lat,
        lng: selectedVendor.koordinaten.lng
      };
    }
    
    // Filter vendors that have valid coordinates for center calculation
    const vendorsWithCoords = filteredVendors.filter(v => 
      v.koordinaten && v.koordinaten.lat !== 0 && v.koordinaten.lng !== 0
    );
    
    if (vendorsWithCoords.length > 0) {
      const avgLat = vendorsWithCoords.reduce((sum, v) => sum + v.koordinaten!.lat, 0) / vendorsWithCoords.length;
      const avgLng = vendorsWithCoords.reduce((sum, v) => sum + v.koordinaten!.lng, 0) / vendorsWithCoords.length;
      return { lat: avgLat, lng: avgLng };
    }
    
    // Default center for Germany
    return { lat: 51.1657, lng: 10.4515 };
  };

  // Get zoom level based on selection
  const getMapZoom = () => {
    if (selectedVendor && selectedVendor.koordinaten) {
      return 15; // Close zoom for selected vendor
    }
    
    // Count vendors with valid coordinates
    const vendorsWithCoords = filteredVendors.filter(v => 
      v.koordinaten && v.koordinaten.lat !== 0 && v.koordinaten.lng !== 0
    );
    
    if (vendorsWithCoords.length === 0) {
      return 6; // Country-wide view
    }
    
    if (vendorsWithCoords.length === 1) {
      return 13; // Close view for single vendor
    }
    
    return 10; // Regional view for multiple vendors
  };

  // Convert vendors to markers for the map (only those with valid coordinates)
  const getVendorMarkers = () => {
    return filteredVendors
      .filter(vendor => vendor.koordinaten && vendor.koordinaten.lat !== 0 && vendor.koordinaten.lng !== 0)
      .map(vendor => ({
        id: vendor.id,
        position: vendor.koordinaten!,
        title: vendor.unternehmen,
        description: `${vendor.adresse.ort} • ${vendor.kategorien.slice(0, 2).join(', ')}${vendor.kategorien.length > 2 ? '...' : ''}`
      }));
  };

  // Handle marker click to select vendor
  const handleMarkerClick = (marker: any) => {
    const vendor = filteredVendors.find(v => v.id === marker.id);
    if (vendor) {
      setSelectedVendor(vendor);
    }
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
          Finde alle Direktvermarkter in der Region auf einer interaktiven Karte und entdecke, wo du frische, lokale Produkte direkt vom Erzeuger bekommen kannst.
        </p>
      </div>
      
      {/* Show preview if no vendors available */}
      {direktvermarkter.length === 0 && !loading && !error && (
        <VendorListPreview 
          title="Direktvermarkter-Karte in Vorbereitung"
          description="Die interaktive Karte mit allen Direktvermarktern wird verfügbar sein, sobald sich die ersten Anbieter registriert haben."
          className="mb-8"
        />
      )}

      {/* Geocoding Progress */}
      {geocodingProgress.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            <div className="flex-grow">
              <p className="text-blue-800 font-medium">Standorte werden ermittelt...</p>
              <p className="text-blue-600 text-sm">
                GPS-Koordinaten für {geocodingProgress.current} von {geocodingProgress.total} Direktvermarktern gefunden
              </p>
            </div>
            <div className="ml-4 text-blue-600 text-sm font-medium">
              {Math.round((geocodingProgress.current / geocodingProgress.total) * 100)}%
            </div>
          </div>
          <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(geocodingProgress.current / geocodingProgress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Filter und Suchbereich - only show if vendors are available */}
      {direktvermarkter.length > 0 && (
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
      )}

      {/* Map and vendor list - only show if vendors are available */}
      {direktvermarkter.length > 0 && (
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
          <div className="bg-white rounded-lg shadow-md overflow-hidden h-[600px] relative">
            <SimpleMapComponent
              center={getMapCenter()}
              zoom={getMapZoom()}
              markers={getVendorMarkers()}
              onMarkerClick={handleMarkerClick}
              showPopups={true}
              selectedMarkerId={selectedVendor?.id}
              fitBounds={!selectedVendor && filteredVendors.length > 1}
              className="h-full w-full"
            />
            
            {/* Show All Vendors Button - only when a vendor is selected */}
            {selectedVendor && filteredVendors.length > 1 && (
              <button
                onClick={() => setSelectedVendor(null)}
                className="absolute top-4 left-4 bg-white shadow-md hover:shadow-lg px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 transition-all z-10"
              >
                Alle anzeigen
              </button>
            )}
          </div>
        </div>
      </div>
      )}
        
      {/* Direktvermarkter-Details */}
      {selectedVendor && direktvermarkter.length > 0 && (
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