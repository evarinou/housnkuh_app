// client/src/pages/vendor/VendorProfilePage.tsx
import React, { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { User, Save, Mail, Phone, Building, CheckCircle, AlertCircle, Upload, X, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import VendorLayout from '../../components/vendor/VendorLayout';
import axios from 'axios';

interface ProfileData {
  name: string;
  email: string;
  telefon: string;
  unternehmen: string;
  beschreibung: string;
  profilBild: string;
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
  // Neue Felder für Marketing
  slogan: string;
  website: string;
  socialMedia: {
    facebook: string;
    instagram: string;
  };
}

const VendorProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useVendorAuth();
  const navigate = useNavigate();
  
  // Erfolgs- und Fehlerstate
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profilformular-Daten
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    telefon: '',
    unternehmen: '',
    beschreibung: '',
    profilBild: '',
    adresse: {
      strasse: '',
      hausnummer: '',
      plz: '',
      ort: ''
    },
    oeffnungszeiten: {
      montag: '',
      dienstag: '',
      mittwoch: '',
      donnerstag: '',
      freitag: '',
      samstag: '',
      sonntag: ''
    },
    kategorien: [],
    slogan: '',
    website: '',
    socialMedia: {
      facebook: '',
      instagram: ''
    }
  });
  
  // State für Bild-Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Kategorien für Direktvermarkter
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
  
  // Wenn nicht authentifiziert und nicht mehr lädt, zum Login weiterleiten
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/vendor/login');
    }
  }, [isLoading, isAuthenticated, navigate]);
  
  // Profildaten laden
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || !user.id) return;
      
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        const token = localStorage.getItem('vendorToken');
        
        if (!token) {
          navigate('/vendor/login');
          return;
        }
        
        const response = await axios.get(`${apiUrl}/vendor-auth/profile/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          setProfileData(response.data.profile);
          setPreviewUrl(response.data.profile.profilBild);
        } else {
          setErrorMessage('Profildaten konnten nicht geladen werden.');
        }
      } catch (err) {
        console.error('Fehler beim Laden der Profildaten:', err);
        setErrorMessage('Profildaten konnten nicht geladen werden.');
        
        // Falls Token ungültig ist, zum Login weiterleiten
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem('vendorToken');
          navigate('/vendor/login');
        }
      }
    };
    
    if (user) {
      fetchProfileData();
    }
  }, [user, navigate]);
  
  // Datei-Input-Referenz
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Bild auswählen
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Vorschau erstellen
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Bildupload durchführen
  const handleImageUpload = async (): Promise<string> => {
    if (!selectedFile) return profileData.profilBild;
    
    setIsUploading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('vendorToken');
      
      if (!token) {
        throw new Error('Nicht authentifiziert');
      }
      
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      const response = await axios.post(`${apiUrl}/vendor-auth/upload-image`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        // Vollständige URL mit Server-URL konstruieren
        const fullImageUrl = `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:4000'}${response.data.imageUrl}`;
        return fullImageUrl;
      } else {
        throw new Error(response.data.message || 'Upload fehlgeschlagen');
      }
    } catch (err) {
      console.error('Fehler beim Hochladen des Bildes:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem('vendorToken');
        navigate('/vendor/login');
      }
      throw new Error('Bild konnte nicht hochgeladen werden');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Bild löschen
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setProfileData(prev => ({
      ...prev,
      profilBild: ''
    }));
  };
  
  // Datei-Input-Click simulieren
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Profil speichern
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      // Zuerst das Bild hochladen, wenn eines ausgewählt wurde
      let imageUrl = profileData.profilBild;
      if (selectedFile) {
        imageUrl = await handleImageUpload();
      }
      
      // Aktualisiertes Profil mit Bild-URL
      const updatedProfile = {
        ...profileData,
        profilBild: imageUrl
      };
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('vendorToken');
      
      if (!token) {
        navigate('/vendor/login');
        return;
      }
      
      const response = await axios.put(`${apiUrl}/vendor-auth/profile/${user?.id}`, updatedProfile, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        // Profildaten aktualisieren
        setProfileData(updatedProfile);
        setSelectedFile(null);
        
        setSuccessMessage('Profil erfolgreich gespeichert!');
        
        // Nach einiger Zeit die Erfolgsmeldung verschwinden lassen
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        setErrorMessage(response.data.message || 'Profil konnte nicht gespeichert werden.');
      }
    } catch (err) {
      console.error('Fehler beim Speichern des Profils:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem('vendorToken');
        navigate('/vendor/login');
      } else {
        setErrorMessage('Profil konnte nicht gespeichert werden. Bitte versuchen Sie es später erneut.');
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  // Formular-Input-Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Überprüfen, ob es sich um ein verschachteltes Feld handelt (z.B. adresse.strasse)
    if (name.includes('.')) {
      const [parentField, childField] = name.split('.');
      // Überprüfen und Type-Casting für verschachtelte Felder
      const parentValue = profileData[parentField as keyof ProfileData];
      
      // Sicherstellen, dass es ein Objekt ist, bevor wir es ausbreiten
      if (parentValue && typeof parentValue === 'object' && !Array.isArray(parentValue)) {
        setProfileData({
          ...profileData,
          [parentField]: {
            ...parentValue,
            [childField]: value
          }
        });
      } else {
        console.error('Ungültiges verschachteltes Feld:', parentField);
      }
    } else {
      setProfileData({
        ...profileData,
        [name]: value
      });
    }
  };
  
  // Kategorie-Toggle-Handler
  const handleKategorieToggle = (kategorie: string) => {
    setProfileData(prevData => {
      const kategorien = [...prevData.kategorien];
      
      if (kategorien.includes(kategorie)) {
        return {
          ...prevData,
          kategorien: kategorien.filter(k => k !== kategorie)
        };
      } else {
        return {
          ...prevData,
          kategorien: [...kategorien, kategorie]
        };
      }
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Laden...</span>
      </div>
    );
  }
  
  return (
    <VendorLayout>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <User className="mr-2 h-6 w-6 text-primary" />
            Mein Profil
          </h1>
          <p className="text-gray-600 mb-6">
            Verwalten Sie Ihre Profildaten und Einstellungen, um Ihren Auftritt auf housnkuh zu optimieren.
          </p>
          
          {/* Erfolgs- oder Fehlermeldung */}
          {successMessage && (
            <div className="mb-4 p-4 rounded-md bg-green-50 text-green-800 flex items-start">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-4 p-4 rounded-md bg-red-50 text-red-800 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          
          <form onSubmit={handleSaveProfile}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Persönliche Informationen */}
              <div className="col-span-2">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-1 border-b">
                  Persönliche Informationen
                </h2>
              </div>
              
              {/* Profilbild-Upload */}
              <div className="col-span-2 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profilbild
                </label>
                <div className="flex items-start space-x-6">
                  {/* Bild-Vorschau */}
                  <div className="flex-shrink-0 relative">
                    {previewUrl ? (
                      <div className="relative group">
                        <img 
                          src={previewUrl} 
                          alt="Profilbild"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Bild entfernen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                        <Image className="w-10 h-10 mb-1" />
                        <span className="text-xs text-center">Kein Bild</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Upload-Bereich */}
                  <div className="flex-grow">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center"
                        disabled={isUploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? 'Wird hochgeladen...' : 'Bild hochladen'}
                      </button>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                      
                      {isUploading && (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2"></div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Empfohlene Größe: 400 x 400 Pixel. Max. 5 MB (JPG, PNG)
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Dieses Bild wird auf Ihrer öffentlichen Profilseite angezeigt.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleInputChange}
                    className="flex-1 border border-gray-300 rounded-r-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    readOnly
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Die E-Mail-Adresse kann nicht geändert werden.</p>
              </div>
              
              <div>
                <label htmlFor="telefon" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    id="telefon"
                    name="telefon"
                    value={profileData.telefon}
                    onChange={handleInputChange}
                    className="flex-1 border border-gray-300 rounded-r-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="unternehmen" className="block text-sm font-medium text-gray-700 mb-1">
                  Unternehmen / Betrieb
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    <Building className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    id="unternehmen"
                    name="unternehmen"
                    value={profileData.unternehmen}
                    onChange={handleInputChange}
                    className="flex-1 border border-gray-300 rounded-r-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              
              <div className="col-span-2">
                <label htmlFor="beschreibung" className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung / Über uns
                </label>
                <textarea
                  id="beschreibung"
                  name="beschreibung"
                  value={profileData.beschreibung}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Beschreiben Sie Ihren Betrieb und Ihre Produkte..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Diese Beschreibung wird auf Ihrer öffentlichen Profilseite angezeigt.
                </p>
              </div>
              
              {/* Adresse */}
              <div className="col-span-2 mt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-1 border-b">
                  Adresse
                </h2>
              </div>
              
              <div>
                <label htmlFor="adresse.strasse" className="block text-sm font-medium text-gray-700 mb-1">
                  Straße *
                </label>
                <input
                  type="text"
                  id="adresse.strasse"
                  name="adresse.strasse"
                  value={profileData.adresse.strasse}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="adresse.hausnummer" className="block text-sm font-medium text-gray-700 mb-1">
                  Hausnummer *
                </label>
                <input
                  type="text"
                  id="adresse.hausnummer"
                  name="adresse.hausnummer"
                  value={profileData.adresse.hausnummer}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="adresse.plz" className="block text-sm font-medium text-gray-700 mb-1">
                  PLZ *
                </label>
                <input
                  type="text"
                  id="adresse.plz"
                  name="adresse.plz"
                  value={profileData.adresse.plz}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  pattern="[0-9]{5}"
                  title="Bitte geben Sie eine gültige 5-stellige Postleitzahl ein"
                />
              </div>
              
              <div>
                <label htmlFor="adresse.ort" className="block text-sm font-medium text-gray-700 mb-1">
                  Ort *
                </label>
                <input
                  type="text"
                  id="adresse.ort"
                  name="adresse.ort"
                  value={profileData.adresse.ort}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              
              {/* Marketing und Online-Präsenz */}
              <div className="col-span-2 mt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-1 border-b">
                  Marketing und Online-Präsenz
                </h2>
              </div>
              
              <div>
                <label htmlFor="slogan" className="block text-sm font-medium text-gray-700 mb-1">
                  Slogan / Motto
                </label>
                <input
                  type="text"
                  id="slogan"
                  name="slogan"
                  value={profileData.slogan}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ihr Motto oder Slogan"
                />
              </div>
              
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Webseite
                </label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={profileData.website}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="www.example.com"
                />
              </div>
              
              <div>
                <label htmlFor="socialMedia.facebook" className="block text-sm font-medium text-gray-700 mb-1">
                  Facebook (Nutzername)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    facebook.com/
                  </span>
                  <input
                    type="text"
                    id="socialMedia.facebook"
                    name="socialMedia.facebook"
                    value={profileData.socialMedia.facebook}
                    onChange={handleInputChange}
                    className="flex-1 border border-gray-300 rounded-r-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="ihrname"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="socialMedia.instagram" className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram (Nutzername)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    instagram.com/
                  </span>
                  <input
                    type="text"
                    id="socialMedia.instagram"
                    name="socialMedia.instagram"
                    value={profileData.socialMedia.instagram}
                    onChange={handleInputChange}
                    className="flex-1 border border-gray-300 rounded-r-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="ihrname"
                  />
                </div>
              </div>
              
              {/* Öffnungszeiten */}
              <div className="col-span-2 mt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-1 border-b">
                  Öffnungszeiten
                </h2>
                <p className="mb-3 text-sm text-gray-600">
                  Geben Sie Ihre Öffnungszeiten ein. Format: "08:00 - 18:00" oder "Geschlossen".
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 col-span-2">
                <div>
                  <label htmlFor="oeffnungszeiten.montag" className="block text-sm font-medium text-gray-700 mb-1">
                    Montag
                  </label>
                  <input
                    type="text"
                    id="oeffnungszeiten.montag"
                    name="oeffnungszeiten.montag"
                    value={profileData.oeffnungszeiten.montag}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="08:00 - 18:00"
                  />
                </div>
                
                <div>
                  <label htmlFor="oeffnungszeiten.dienstag" className="block text-sm font-medium text-gray-700 mb-1">
                    Dienstag
                  </label>
                  <input
                    type="text"
                    id="oeffnungszeiten.dienstag"
                    name="oeffnungszeiten.dienstag"
                    value={profileData.oeffnungszeiten.dienstag}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="08:00 - 18:00"
                  />
                </div>
                
                <div>
                  <label htmlFor="oeffnungszeiten.mittwoch" className="block text-sm font-medium text-gray-700 mb-1">
                    Mittwoch
                  </label>
                  <input
                    type="text"
                    id="oeffnungszeiten.mittwoch"
                    name="oeffnungszeiten.mittwoch"
                    value={profileData.oeffnungszeiten.mittwoch}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="08:00 - 18:00"
                  />
                </div>
                
                <div>
                  <label htmlFor="oeffnungszeiten.donnerstag" className="block text-sm font-medium text-gray-700 mb-1">
                    Donnerstag
                  </label>
                  <input
                    type="text"
                    id="oeffnungszeiten.donnerstag"
                    name="oeffnungszeiten.donnerstag"
                    value={profileData.oeffnungszeiten.donnerstag}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="08:00 - 18:00"
                  />
                </div>
                
                <div>
                  <label htmlFor="oeffnungszeiten.freitag" className="block text-sm font-medium text-gray-700 mb-1">
                    Freitag
                  </label>
                  <input
                    type="text"
                    id="oeffnungszeiten.freitag"
                    name="oeffnungszeiten.freitag"
                    value={profileData.oeffnungszeiten.freitag}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="08:00 - 18:00"
                  />
                </div>
                
                <div>
                  <label htmlFor="oeffnungszeiten.samstag" className="block text-sm font-medium text-gray-700 mb-1">
                    Samstag
                  </label>
                  <input
                    type="text"
                    id="oeffnungszeiten.samstag"
                    name="oeffnungszeiten.samstag"
                    value={profileData.oeffnungszeiten.samstag}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="08:00 - 14:00"
                  />
                </div>
                
                <div>
                  <label htmlFor="oeffnungszeiten.sonntag" className="block text-sm font-medium text-gray-700 mb-1">
                    Sonntag
                  </label>
                  <input
                    type="text"
                    id="oeffnungszeiten.sonntag"
                    name="oeffnungszeiten.sonntag"
                    value={profileData.oeffnungszeiten.sonntag}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Geschlossen"
                  />
                </div>
              </div>
              
              {/* Produktkategorien */}
              <div className="col-span-2 mt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-1 border-b">
                  Produktkategorien
                </h2>
                <p className="mb-3 text-sm text-gray-600">
                  Wählen Sie die Kategorien aus, die Ihre Produkte am besten beschreiben.
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {verfuegbareKategorien.map(kategorie => (
                    <div key={kategorie} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`kategorie-${kategorie}`}
                        checked={profileData.kategorien.includes(kategorie)}
                        onChange={() => handleKategorieToggle(kategorie)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor={`kategorie-${kategorie}`} className="ml-2 block text-sm text-gray-700">
                        {kategorie}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Speichern-Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Speichern...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Änderungen speichern</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorProfilePage;