// client/src/pages/DirektvermarkterDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ExternalLink, Calendar, Clock, Facebook, Instagram, ChevronLeft } from 'lucide-react';
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
  oeffnungszeiten: {
    montag: string;
    dienstag: string;
    mittwoch: string;
    donnerstag: string;
    freitag: string;
    samstag: string;
    sonntag: string;
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

const DirektvermarkterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [direktvermarkter, setDirektvermarkter] = useState<Direktvermarkter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
        {/* Header mit Profilbild */}
        <div className="relative h-60 md:h-80 bg-gradient-to-r from-primary-800 to-primary-600">
          {direktvermarkter.profilBild ? (
            <>
              <div className="absolute inset-0 bg-black opacity-30"></div>
              <img 
                src={direktvermarkter.profilBild} 
                alt={direktvermarkter.unternehmen} 
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
            <div className="max-w-4xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {direktvermarkter.unternehmen}
              </h1>
              {direktvermarkter.slogan && (
                <p className="text-lg md:text-xl italic text-white/90 mb-3">
                  "{direktvermarkter.slogan}"
                </p>
              )}
              <div className="flex flex-wrap gap-2 mb-2">
                {direktvermarkter.kategorien.map(kategorie => (
                  <span key={kategorie} className="inline-block px-3 py-1 text-sm text-white bg-primary rounded-full">
                    {kategorie}
                  </span>
                ))}
              </div>
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
              
              {/* Google Maps Einbettung (Platzhalter) */}
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Standort</h3>
                <div className="bg-gray-200 h-80 rounded-lg overflow-hidden">
                  <iframe
                    title="Standortkarte"
                    className="w-full h-full border-0"
                    src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(
                      `${direktvermarkter.adresse.strasse} ${direktvermarkter.adresse.hausnummer}, ${direktvermarkter.adresse.plz} ${direktvermarkter.adresse.ort}, Deutschland`
                    )}`}
                    allowFullScreen
                  ></iframe>
                </div>
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