/**
 * @file DirektvermarkterDetailPage.tsx
 * @purpose Detailed profile page for individual direct marketers with comprehensive information
 * @created 2024-01-01
 * @modified 2025-08-05
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ExternalLink, Calendar, Clock, Facebook, Instagram, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import { resolveImageUrl } from '../utils/imageUtils';
import SimpleMapComponent from '../components/SimpleMapComponent';

/**
 * Tag/category information for direct marketers
 * @property {string} id - Unique identifier for the tag
 * @property {string} name - Display name of the tag
 * @property {string} slug - URL-friendly tag identifier
 * @property {string} [description] - Optional detailed description
 * @property {'product'|'certification'|'method'|'feature'} category - Tag category type
 * @property {string} [color] - Optional color code for display
 * @property {string} [icon] - Optional icon representation
 */
interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: 'product' | 'certification' | 'method' | 'feature';
  color?: string;
  icon?: string;
}

/**
 * Rental compartment/Mietfach information
 * @property {string} id - Unique identifier for the compartment
 * @property {string} name - Display name of the compartment
 * @property {string} beschreibung - Description of the compartment
 * @property {number} preis - Monthly rental price
 * @property {string} groesse - Size specification
 * @property {string} standort - Location/site name
 */
interface Mietfach {
  id: string;
  name: string;
  beschreibung: string;
  preis: number;
  groesse: string;
  standort: string;
}

/**
 * Complete direct marketer profile data
 * @property {string} id - Unique identifier for the direct marketer
 * @property {string} name - Contact person name
 * @property {string} unternehmen - Company/business name
 * @property {string} beschreibung - Business description
 * @property {string} profilBild - Profile image URL
 * @property {string} bannerBild - Banner image URL
 * @property {string} telefon - Contact phone number
 * @property {string} email - Contact email address
 * @property {object} adresse - Complete address information with optional coordinates
 * @property {object} oeffnungszeiten - Weekly opening hours
 * @property {Tag[]} tags - Associated product/service tags
 * @property {string} slogan - Business slogan or motto
 * @property {string} website - Business website URL
 * @property {object} socialMedia - Social media handles
 * @property {Mietfach[]} mietfaecher - Rented compartments/locations
 */
interface Direktvermarkter {
  id: string;
  name: string;
  unternehmen: string;
  beschreibung: string;
  profilBild: string;
  bannerBild: string;
  telefon: string;
  email: string;
  adresse: {
    strasse: string;
    hausnummer: string;
    plz: string;
    ort: string;
    koordinaten?: {
      lat: number;
      lng: number;
    };
  };
  oeffnungszeiten: {
    montag: string;
    dienstag: string;
    mittwoch: string;
    donnerstag: string;
    freitag: string;
    samstag: string;
    sonntag: string;
  };
  tags: Tag[];
  slogan: string;
  website: string;
  socialMedia: {
    facebook: string;
    instagram: string;
  };
  mietfaecher: Mietfach[];
}

/**
 * Direct marketer detail page component with comprehensive profile information
 * @description Complete profile page displaying all information about a specific direct marketer including contact details, location map, opening hours, and product categories
 * @returns {JSX.Element} Detailed profile page with interactive map, contact information, and business details
 */
const DirektvermarkterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [direktvermarkter, setDirektvermarkter] = useState<Direktvermarkter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geocodedCoordinates, setGeocodedCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError('Keine ID angegeben');
        setLoading(false);
        return;
      }
      
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        const response = await axios.get(`${apiUrl}/vendor-auth/public/profile/${id}`);
        
        if (response.data.success) {
          setDirektvermarkter(response.data.vendor);
        } else {
          console.error('API Fehler:', response.data.message);
          setError('Direktvermarkter nicht gefunden.');
        }
        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err);
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError('Direktvermarkter nicht gefunden.');
        } else {
          setError('Die Daten konnten nicht geladen werden.');
        }
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  // Geocoding mit OpenStreetMap Nominatim API
  const geocodeAddress = async (address: string) => {
    try {
      setGeocodingLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=de`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const coordinates = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        setGeocodedCoordinates(coordinates);
        return coordinates;
      }
      return null;
    } catch (error) {
      console.error('Geocoding fehler:', error);
      return null;
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Hilfsfunktion muss vor useEffect definiert werden
  const hasValidCoordinatesForUseEffect = (vendor: Direktvermarkter | null) => {
    return vendor?.adresse?.koordinaten && 
           vendor.adresse.koordinaten.lat !== 0 && 
           vendor.adresse.koordinaten.lng !== 0;
  };

  // Automatisches Geocoding wenn keine Koordinaten vorhanden
  useEffect(() => {
    if (direktvermarkter && !hasValidCoordinatesForUseEffect(direktvermarkter) && !geocodedCoordinates) {
      const fullAddress = `${direktvermarkter.adresse.strasse} ${direktvermarkter.adresse.hausnummer}, ${direktvermarkter.adresse.plz} ${direktvermarkter.adresse.ort}, Deutschland`;
      geocodeAddress(fullAddress);
    }
  }, [direktvermarkter, geocodedCoordinates]);
  
  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-lg text-gray-600">Lade Direktvermarkter-Profil...</span>
        </div>
      </div>
    );
  }
  
  if (error || !direktvermarkter) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{error || 'Direktvermarkter nicht gefunden'}</p>
          <Link 
            to="/direktvermarkter/uebersicht" 
            className="mt-2 inline-block px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }
  
  // Hilfsfunktion zum Formatieren der Beschreibung mit Absätzen
  const formatDescription = (text: string) => {
    return text.split('\n\n').map((paragraph, idx) => (
      <p key={idx} className="mb-4">{paragraph}</p>
    ));
  };

  // Prüfen ob echte Koordinaten verfügbar sind
  const hasValidCoordinates = () => {
    return direktvermarkter?.adresse?.koordinaten && 
           direktvermarkter.adresse.koordinaten.lat !== 0 && 
           direktvermarkter.adresse.koordinaten.lng !== 0;
  };

  // Prüfen ob irgendwelche Koordinaten verfügbar sind (DB oder geocoded)
  const hasAnyCoordinates = () => {
    return hasValidCoordinates() || geocodedCoordinates !== null;
  };

  // Koordinaten für die Karte ermitteln (DB oder geocoded)
  const getMapCoordinates = () => {
    if (hasValidCoordinates()) {
      return direktvermarkter!.adresse.koordinaten!;
    }
    
    if (geocodedCoordinates) {
      return geocodedCoordinates;
    }
    
    return null;
  };

  // Marker-Daten für die Karte
  const getMapMarker = () => {
    const coords = getMapCoordinates();
    if (!coords) return null;
    
    const fullAddress = `${direktvermarkter?.adresse.strasse} ${direktvermarkter?.adresse.hausnummer}, ${direktvermarkter?.adresse.plz} ${direktvermarkter?.adresse.ort}`;
    
    return {
      id: direktvermarkter?.id || 'vendor',
      position: coords,
      title: direktvermarkter?.unternehmen || direktvermarkter?.name || 'Direktvermarkter',
      description: fullAddress
    };
  };
  
  return (
    <div className="container mx-auto py-12 px-4">
      {/* Zurück-Button */}
      <Link 
        to="/direktvermarkter/uebersicht" 
        className="inline-flex items-center text-primary hover:text-primary-700 mb-6"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        <span>Zurück zur Übersicht</span>
      </Link>
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Banner-Bild Header */}
        <div className="relative h-60 md:h-80 bg-gradient-to-r from-primary-800 to-primary-600">
          {direktvermarkter.bannerBild ? (
            <>
              <div className="absolute inset-0 bg-black opacity-40"></div>
              <img 
                src={resolveImageUrl(direktvermarkter.bannerBild)} 
                alt={`${direktvermarkter.unternehmen} Banner`} 
                className="w-full h-full object-cover"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Overlay mit Unternehmensinformationen */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-6 text-white">
            <div className="max-w-4xl relative">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {direktvermarkter.unternehmen}
              </h1>
              {direktvermarkter.slogan && (
                <p className="text-lg md:text-xl italic text-white/90 mb-3">
                  "{direktvermarkter.slogan}"
                </p>
              )}
            </div>
            
            {/* Tags - rechts unten positioniert */}
            {direktvermarkter.tags && direktvermarkter.tags.length > 0 && (
              <div className="absolute bottom-6 right-6">
                <div className="flex flex-wrap gap-2 justify-end">
                  {direktvermarkter.tags.slice(0, 5).map(tag => (
                    <span 
                      key={tag.id} 
                      className="inline-block px-3 py-1 text-sm text-white bg-primary/90 rounded-full backdrop-blur-sm border border-white/20"
                      style={tag.color ? { backgroundColor: tag.color + 'E6' } : undefined}
                      title={tag.description || tag.name}
                    >
                      {tag.icon && <span className="mr-1">{tag.icon}</span>}
                      {tag.name}
                    </span>
                  ))}
                  {direktvermarkter.tags.length > 5 && (
                    <span 
                      className="inline-block px-3 py-1 text-sm text-white bg-gray-500/90 rounded-full backdrop-blur-sm border border-white/20"
                      title={`+${direktvermarkter.tags.length - 5} weitere Tags`}
                    >
                      +{direktvermarkter.tags.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Profilbild - unten links vom Banner */}
        <div className="relative px-6 md:px-8">
          <div className="flex items-end -mt-16 mb-4">
            <div className="relative">
              {direktvermarkter.profilBild ? (
                <img 
                  src={resolveImageUrl(direktvermarkter.profilBild)} 
                  alt={direktvermarkter.name} 
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="ml-6 pb-2">
              <h2 className="text-2xl font-bold text-gray-900">{direktvermarkter.name}</h2>
              <p className="text-gray-600">Ansprechpartner</p>
            </div>
          </div>
        </div>
        
        {/* Hauptinhalt */}
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Linke Spalte - Kontaktinformationen */}
            <div className="md:col-span-1">
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Kontaktinformationen</h2>
                
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Ansprechpartner</h3>
                    <p className="text-gray-900">{direktvermarkter.name}</p>
                  </div>
                  
                  {/* Adresse */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                      Adresse
                    </h3>
                    <p className="text-gray-900">
                      {direktvermarkter.adresse.strasse} {direktvermarkter.adresse.hausnummer}<br />
                      {direktvermarkter.adresse.plz} {direktvermarkter.adresse.ort}
                    </p>
                  </div>
                  
                  {/* Telefon */}
                  {direktvermarkter.telefon && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 flex items-center">
                        <Phone className="w-4 h-4 mr-1 text-gray-400" />
                        Telefon
                      </h3>
                      <p className="text-gray-900">{direktvermarkter.telefon}</p>
                    </div>
                  )}
                  
                  {/* Email */}
                  {direktvermarkter.email && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 flex items-center">
                        <Mail className="w-4 h-4 mr-1 text-gray-400" />
                        E-Mail
                      </h3>
                      <a 
                        href={`mailto:${direktvermarkter.email}`} 
                        className="text-primary hover:underline"
                      >
                        {direktvermarkter.email}
                      </a>
                    </div>
                  )}
                  
                  {/* Website */}
                  {direktvermarkter.website && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 flex items-center">
                        <ExternalLink className="w-4 h-4 mr-1 text-gray-400" />
                        Website
                      </h3>
                      <a 
                        href={`https://${direktvermarkter.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {direktvermarkter.website}
                      </a>
                    </div>
                  )}
                  
                  {/* Social Media */}
                  {(direktvermarkter.socialMedia.facebook || direktvermarkter.socialMedia.instagram) && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Social Media</h3>
                      <div className="flex space-x-2 mt-1">
                        {direktvermarkter.socialMedia.facebook && (
                          <a 
                            href={`https://facebook.com/${direktvermarkter.socialMedia.facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            aria-label="Facebook"
                          >
                            <Facebook className="w-5 h-5" />
                          </a>
                        )}
                        
                        {direktvermarkter.socialMedia.instagram && (
                          <a 
                            href={`https://instagram.com/${direktvermarkter.socialMedia.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-600 hover:text-pink-800 transition-colors"
                            aria-label="Instagram"
                          >
                            <Instagram className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Öffnungszeiten */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-gray-500" />
                    Öffnungszeiten
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Montag</span>
                      <span>{direktvermarkter.oeffnungszeiten.montag || 'Nicht angegeben'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Dienstag</span>
                      <span>{direktvermarkter.oeffnungszeiten.dienstag || 'Nicht angegeben'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Mittwoch</span>
                      <span>{direktvermarkter.oeffnungszeiten.mittwoch || 'Nicht angegeben'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Donnerstag</span>
                      <span>{direktvermarkter.oeffnungszeiten.donnerstag || 'Nicht angegeben'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Freitag</span>
                      <span>{direktvermarkter.oeffnungszeiten.freitag || 'Nicht angegeben'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Samstag</span>
                      <span>{direktvermarkter.oeffnungszeiten.samstag || 'Nicht angegeben'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Sonntag</span>
                      <span>{direktvermarkter.oeffnungszeiten.sonntag || 'Nicht angegeben'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mietfächer */}
              {direktvermarkter.mietfaecher && direktvermarkter.mietfaecher.length > 0 && (
                <div className="mt-6 bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-gray-500" />
                    Gemietete Fächer
                  </h2>
                  
                  <div className="space-y-4">
                    {direktvermarkter.mietfaecher.map(mf => (
                      <div key={mf.id} className="bg-white p-4 rounded-md border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-medium text-gray-900">{mf.name}</h3>
                          <span className="px-2 py-1 bg-primary-50 text-primary text-xs font-medium rounded-full">
                            {mf.standort}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1 text-sm">{mf.beschreibung}</p>
                        <div className="mt-2 flex justify-between text-sm">
                          <span className="text-gray-500">Größe: {mf.groesse}</span>
                          <span className="font-medium text-gray-900">{mf.preis.toFixed(2)} €/Monat</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Rechte Spalte - Über uns */}
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Über {direktvermarkter.unternehmen || direktvermarkter.name}</h2>
              <div className="prose max-w-none text-gray-700">
                {direktvermarkter.beschreibung ? 
                  formatDescription(direktvermarkter.beschreibung) : 
                  <p className="text-gray-500 italic">Noch keine Beschreibung verfügbar.</p>
                }
              </div>
              
              {/* Tags/Produktkategorien */}
              {direktvermarkter.tags && direktvermarkter.tags.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Produktkategorien</h3>
                  <div className="flex flex-wrap gap-2">
                    {direktvermarkter.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
                        title={tag.description || tag.name}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Standortkarte */}
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Standort</h3>
                
                {hasAnyCoordinates() ? (
                  <div className="h-80 rounded-lg overflow-hidden shadow-lg">
                    <SimpleMapComponent
                      center={getMapCoordinates()!}
                      zoom={15}
                      markers={[getMapMarker()!]}
                      showPopups={true}
                      className="h-full w-full"
                    />
                    {geocodedCoordinates && !hasValidCoordinates() && (
                      <p className="mt-1 text-xs text-gray-400 italic">
                        📍 Koordinaten automatisch ermittelt
                      </p>
                    )}
                  </div>
                ) : geocodingLoading ? (
                  <div className="h-80 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <h4 className="text-lg font-medium text-gray-700 mb-2">Standort wird ermittelt...</h4>
                      <p className="text-gray-500">
                        GPS-Koordinaten werden automatisch über die Adresse gesucht.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-80 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h4 className="text-lg font-medium text-gray-700 mb-2">Standortkarte nicht verfügbar</h4>
                      <p className="text-gray-500 mb-3">
                        Der Standort konnte nicht automatisch ermittelt werden.
                      </p>
                      <a 
                        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(
                          `${direktvermarkter?.adresse.strasse} ${direktvermarkter?.adresse.hausnummer}, ${direktvermarkter?.adresse.plz} ${direktvermarkter?.adresse.ort}, Deutschland`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors text-sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Standort auf OpenStreetMap suchen
                      </a>
                    </div>
                  </div>
                )}
                
                <p className="mt-2 text-sm text-gray-500">
                  Adresse: {direktvermarkter.adresse.strasse} {direktvermarkter.adresse.hausnummer}, {direktvermarkter.adresse.plz} {direktvermarkter.adresse.ort}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirektvermarkterDetailPage;