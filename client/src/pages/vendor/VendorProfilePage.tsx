// client/src/pages/vendor/VendorProfilePage.tsx
import React, { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { User, Save, Mail, Phone, Building, CheckCircle, AlertCircle, Upload, X, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import VendorLayout from '../../components/vendor/VendorLayout';
import axios from 'axios';
import { resolveImageUrl } from '../../utils/imageUtils';

interface Tag {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  category: 'product' | 'certification' | 'method' | 'feature';
  color?: string;
  icon?: string;
}

interface BusinessDetails {
  certifications: Tag[];
  productionMethods: Tag[];
  businessType: 'farm' | 'cooperative' | 'processing' | 'retail';
  farmSize: string;
  founded: string | null;
}

interface Location {
  coordinates: [number, number] | null;
  address: string;
  deliveryRadius: number | null;
  deliveryAreas: string[];
}

interface ProfileData {
  name: string;
  email: string;
  telefon: string;
  unternehmen: string;
  beschreibung: string;
  profilBild: string;
  bannerBild: string;
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
  
  // Tag-basiertes System
  tags: Tag[];
  businessDetails: BusinessDetails;
  location: Location;
  
  // Marketing
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
    bannerBild: '', // Banner-Bild hinzugefügt
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
    
    // Tag-basiertes System
    tags: [],
    businessDetails: {
      certifications: [],
      productionMethods: [],
      businessType: 'farm',
      farmSize: '',
      founded: null
    },
    location: {
      coordinates: null,
      address: '',
      deliveryRadius: null,
      deliveryAreas: []
    },
    
    // Marketing
    slogan: '',
    website: '',
    socialMedia: {
      facebook: '',
      instagram: ''
    }
  });
  
  // State für Profilbild-Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  
  // State für Banner-Upload
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string>('');
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  
  // State für verfügbare Tags
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  
  // State für neue Tag-Erstellung
  const [newTagName, setNewTagName] = useState('');
  const [newTagIcon, setNewTagIcon] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6B7280');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  
  
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
          console.log('Profile data received:', response.data.profile);
          console.log('Profile image URL:', response.data.profile.profilBild);
          console.log('Banner image URL:', response.data.profile.bannerBild);
          
          const profileData = response.data.profile;
          
          // Handle tag-based fields - ensure they exist and have proper structure
          const processedProfile = {
            ...profileData,
            tags: (profileData.tags || []).map(normalizeTag),
            businessDetails: {
              certifications: profileData.businessDetails?.certifications || [],
              productionMethods: profileData.businessDetails?.productionMethods || [],
              businessType: profileData.businessDetails?.businessType || 'farm',
              farmSize: profileData.businessDetails?.farmSize || '',
              founded: profileData.businessDetails?.founded || null
            },
            location: {
              coordinates: profileData.location?.coordinates || null,
              address: profileData.location?.address || '',
              deliveryRadius: profileData.location?.deliveryRadius || null,
              deliveryAreas: profileData.location?.deliveryAreas || []
            }
          };
          
          setProfileData(processedProfile);
          setPreviewUrl(resolveImageUrl(profileData.profilBild));
          setBannerPreviewUrl(resolveImageUrl(profileData.bannerBild)); // Banner-Vorschau setzen
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
  
  // Verfügbare Tags laden
  useEffect(() => {
    const loadAvailableTags = async () => {
      setLoadingTags(true);
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        console.log('Loading tags from:', `${apiUrl}/tags?category=product&active=true`);
        const response = await axios.get(`${apiUrl}/tags?category=product&active=true`);
        
        console.log('Tags API response:', response.data);
        
        if (response.data.success) {
          const tags = (response.data.data || []).map(normalizeTag);
          console.log('Processed tags:', tags);
          setAvailableTags(tags);
        } else {
          console.warn('Tags API returned success=false:', response.data);
          setAvailableTags([]);
        }
      } catch (err) {
        console.error('Fehler beim Laden der Tags:', err);
        if (axios.isAxiosError(err)) {
          console.error('Response data:', err.response?.data);
          console.error('Response status:', err.response?.status);
        }
        setAvailableTags([]);
      } finally {
        setLoadingTags(false);
      }
    };
    
    loadAvailableTags();
  }, []);
  
  // Datei-Input-Referenzen
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  
  // Profilbild auswählen
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
  
  // Banner-Bild auswählen
  const handleBannerFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedBannerFile(file);
      
      // Vorschau erstellen
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Profilbild-Upload durchführen
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
        return resolveImageUrl(response.data.imageUrl);
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
  
  // Banner-Upload durchführen
  const handleBannerUpload = async (): Promise<string> => {
    if (!selectedBannerFile) return profileData.bannerBild;
    
    setIsBannerUploading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('vendorToken');
      
      if (!token) {
        throw new Error('Nicht authentifiziert');
      }
      
      const formData = new FormData();
      formData.append('image', selectedBannerFile);
      
      const response = await axios.post(`${apiUrl}/vendor-auth/upload-image`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        return resolveImageUrl(response.data.imageUrl);
      } else {
        throw new Error(response.data.message || 'Upload fehlgeschlagen');
      }
    } catch (err) {
      console.error('Fehler beim Hochladen des Banner-Bildes:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem('vendorToken');
        navigate('/vendor/login');
      }
      throw new Error('Banner-Bild konnte nicht hochgeladen werden');
    } finally {
      setIsBannerUploading(false);
    }
  };
  
  // Profilbild löschen
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setProfileData(prev => ({
      ...prev,
      profilBild: ''
    }));
  };
  
  // Banner-Bild löschen
  const handleRemoveBanner = () => {
    setSelectedBannerFile(null);
    setBannerPreviewUrl('');
    setProfileData(prev => ({
      ...prev,
      bannerBild: ''
    }));
  };
  
  // Datei-Input-Clicks simulieren
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const triggerBannerFileInput = () => {
    bannerFileInputRef.current?.click();
  };
  
  // Profil speichern
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      // Zuerst das Profilbild hochladen, wenn eines ausgewählt wurde
      let imageUrl = profileData.profilBild;
      if (selectedFile) {
        imageUrl = await handleImageUpload();
      }
      
      // Banner-Bild hochladen, wenn eines ausgewählt wurde
      let bannerUrl = profileData.bannerBild;
      if (selectedBannerFile) {
        bannerUrl = await handleBannerUpload();
      }
      
      // Aktualisiertes Profil mit Bild-URLs und tag-basiertem System
      const updatedProfile = {
        ...profileData,
        profilBild: imageUrl,
        bannerBild: bannerUrl,
        // Ensure tag-based fields are properly structured
        tags: profileData.tags || [],
        businessDetails: {
          certifications: profileData.businessDetails?.certifications || [],
          productionMethods: profileData.businessDetails?.productionMethods || [],
          businessType: profileData.businessDetails?.businessType || 'farm',
          farmSize: profileData.businessDetails?.farmSize || '',
          founded: profileData.businessDetails?.founded || null
        },
        location: {
          coordinates: profileData.location?.coordinates || null,
          address: profileData.location?.address || '',
          deliveryRadius: profileData.location?.deliveryRadius || null,
          deliveryAreas: profileData.location?.deliveryAreas || []
        }
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
        setSelectedBannerFile(null);
        
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
  
  // Helper function to get tag ID (handles both id and _id)
  const getTagId = (tag: Tag): string => tag.id || tag._id || '';
  
  // Helper function to normalize tag format (convert _id to id)
  const normalizeTag = (tag: any): Tag => ({
    id: tag.id || tag._id,
    _id: tag._id || tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    category: tag.category,
    color: tag.color,
    icon: tag.icon
  });
  
  // Tag-Toggle-Handler für moderne Tag-Auswahl
  const handleTagToggle = (tag: Tag) => {
    setProfileData(prevData => {
      const currentTags = prevData.tags || [];
      const tagId = getTagId(tag);
      const existingTagIndex = currentTags.findIndex(t => getTagId(t) === tagId);
      
      if (existingTagIndex >= 0) {
        // Remove the tag
        return {
          ...prevData,
          tags: currentTags.filter((_, index) => index !== existingTagIndex)
        };
      } else {
        // Add the tag
        return {
          ...prevData,
          tags: [...currentTags, tag]
        };
      }
    });
  };
  
  // Neuen Tag erstellen
  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) {
      setErrorMessage('Bitte geben Sie einen Tag-Namen ein.');
      return;
    }
    
    // Prüfen ob Tag bereits existiert
    const existingTag = availableTags.find(tag => 
      tag.name.toLowerCase() === newTagName.trim().toLowerCase()
    );
    
    if (existingTag) {
      // Wenn Tag bereits existiert, einfach hinzufügen
      handleTagToggle(existingTag);
      setNewTagName('');
      setNewTagIcon('');
      setNewTagColor('#6B7280');
      return;
    }
    
    setIsCreatingTag(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('vendorToken');
      
      if (!token) {
        navigate('/vendor/login');
        return;
      }
      
      // Tag über die vendor-auth API erstellen
      const requestData = {
        name: newTagName.trim(),
        category: 'product',
        description: `Von ${user?.name || 'Vendor'} erstellt`,
        icon: newTagIcon.trim() || undefined,
        color: newTagColor || '#6B7280'
      };
      
      console.log('Creating tag with data:', requestData);
      console.log('API URL:', `${apiUrl}/vendor-auth/create-tag`);
      console.log('Token present:', !!token);
      
      const response = await axios.post(`${apiUrl}/vendor-auth/create-tag`, requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Tag creation response:', response.data);
      
      if (response.data.success) {
        const newTag = normalizeTag(response.data.tag);
        
        // Tag zu verfügbaren Tags hinzufügen
        setAvailableTags(prev => [...prev, newTag]);
        
        // Tag zu Profil hinzufügen
        handleTagToggle(newTag);
        
        // Inputs zurücksetzen
        setNewTagName('');
        setNewTagIcon('');
        setNewTagColor('#6B7280');
        
        setSuccessMessage(`Tag "${newTag.name}" wurde erfolgreich erstellt und hinzugefügt!`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(response.data.message || 'Tag konnte nicht erstellt werden.');
      }
    } catch (err) {
      console.error('Fehler beim Erstellen des Tags:', err);
      if (axios.isAxiosError(err)) {
        console.log('Response status:', err.response?.status);
        console.log('Response data:', err.response?.data);
        
        if (err.response?.status === 401) {
          localStorage.removeItem('vendorToken');
          navigate('/vendor/login');
        } else if (err.response?.data?.message) {
          setErrorMessage(err.response.data.message);
        } else {
          setErrorMessage(`Fehler ${err.response?.status}: Tag konnte nicht erstellt werden.`);
        }
      } else {
        setErrorMessage('Netzwerkfehler: Tag konnte nicht erstellt werden.');
      }
    } finally {
      setIsCreatingTag(false);
    }
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
              
              {/* Banner-Bild-Upload */}
              <div className="col-span-2 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner-Bild
                </label>
                <div className="flex items-start space-x-6">
                  {/* Banner-Vorschau */}
                  <div className="flex-shrink-0 relative">
                    {bannerPreviewUrl ? (
                      <div className="relative group">
                        <img 
                          src={bannerPreviewUrl} 
                          alt="Banner-Bild"
                          className="w-80 h-24 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveBanner}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Banner entfernen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-80 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                        <Image className="w-8 h-8 mb-1" />
                        <span className="text-xs text-center">Kein Banner</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Banner-Upload-Bereich */}
                  <div className="flex-grow">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={triggerBannerFileInput}
                        className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center"
                        disabled={isBannerUploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isBannerUploading ? 'Wird hochgeladen...' : 'Banner hochladen'}
                      </button>
                      
                      <input
                        ref={bannerFileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleBannerFileSelect}
                      />
                      
                      {isBannerUploading && (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2"></div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Empfohlene Größe: 1200 x 400 Pixel. Max. 5 MB (JPG, PNG)
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Das Banner wird prominent auf Ihrer Profilseite angezeigt.
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
              
              {/* Produktkategorien - Tag-basiert */}
              <div className="col-span-2 mt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-1 border-b">
                  Produktkategorien
                </h2>
                <p className="mb-3 text-sm text-gray-600">
                  Wählen Sie die Tags aus, die Ihre Produkte am besten beschreiben.
                </p>
                
                {loadingTags ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span className="text-gray-600">Tags werden geladen...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Ausgewählte Tags */}
                    {profileData.tags && profileData.tags.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Ausgewählte Tags:</h3>
                        <div className="flex flex-wrap gap-2">
                          {(profileData.tags || []).map(tag => (
                            <span
                              key={getTagId(tag)}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white border border-white/20"
                              style={tag.color ? { backgroundColor: tag.color } : { backgroundColor: '#6B7280' }}
                              title={tag.description || tag.name}
                            >
                              {tag.icon && <span className="mr-1">{tag.icon}</span>}
                              {tag.name}
                              <button
                                type="button"
                                onClick={() => handleTagToggle(tag)}
                                className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/20 transition-colors"
                                title="Tag entfernen"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Neuen Tag erstellen */}
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Neuen Tag erstellen:</h3>
                      
                      {/* Tag Name */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tag Name</label>
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="z.B. Bio-Äpfel, Freilandhaltung, etc."
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleCreateNewTag();
                            }
                          }}
                          disabled={isCreatingTag}
                        />
                      </div>
                      
                      {/* Icon und Farbe */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {/* Icon Auswahl */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Icon (Emoji)</label>
                          <input
                            type="text"
                            value={newTagIcon}
                            onChange={(e) => setNewTagIcon(e.target.value)}
                            placeholder="🥕 🥩 🥛 🍞 🥚"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            disabled={isCreatingTag}
                            maxLength={2}
                          />
                        </div>
                        
                        {/* Farbe Auswahl */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Farbe</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={newTagColor}
                              onChange={(e) => setNewTagColor(e.target.value)}
                              className="w-8 h-8 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
                              disabled={isCreatingTag}
                            />
                            <input
                              type="text"
                              value={newTagColor}
                              onChange={(e) => setNewTagColor(e.target.value)}
                              placeholder="#6B7280"
                              className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                              disabled={isCreatingTag}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Vorschau */}
                      {(newTagName.trim() || newTagIcon.trim()) && (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Vorschau:</label>
                          <span
                            className="inline-block px-3 py-1 text-sm text-white rounded-full"
                            style={{ backgroundColor: newTagColor }}
                          >
                            {newTagIcon && <span className="mr-1">{newTagIcon}</span>}
                            {newTagName.trim() || 'Tag Name'}
                          </span>
                        </div>
                      )}
                      
                      {/* Create Button */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateNewTag}
                          disabled={isCreatingTag || !newTagName.trim()}
                          className="flex-1 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isCreatingTag ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Erstellen...
                            </>
                          ) : (
                            'Tag erstellen'
                          )}
                        </button>
                      </div>
                      
                      <p className="mt-2 text-xs text-gray-500">
                        Erstellen Sie eigene Tags für Ihre Produkte. Diese werden nach Überprüfung auch anderen Direktvermarktern zur Verfügung gestellt.
                      </p>
                    </div>
                    
                    {/* Verfügbare Tags */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Verfügbare Tags:</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {availableTags && availableTags.length > 0 ? availableTags.map(tag => {
                          const isSelected = profileData.tags?.some(t => getTagId(t) === getTagId(tag)) || false;
                          return (
                            <button
                              key={getTagId(tag)}
                              type="button"
                              onClick={() => handleTagToggle(tag)}
                              className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                                isSelected
                                  ? 'text-white border-white/20'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                              }`}
                              style={isSelected && tag.color ? { backgroundColor: tag.color } : undefined}
                              title={tag.description || tag.name}
                            >
                              {tag.icon && <span className="mr-1">{tag.icon}</span>}
                              {tag.name}
                            </button>
                          );
                        }) : (
                          <p className="text-sm text-gray-500 italic p-4 text-center col-span-full">
                            Keine Tags verfügbar
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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