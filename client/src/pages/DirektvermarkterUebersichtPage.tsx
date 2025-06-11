// client/src/pages/DirektvermarkterUebersichtPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, ExternalLink, Search, Map, X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import axios from 'axios';
import { resolveImageUrl } from '../utils/imageUtils';
import VendorListPreview from '../components/VendorListPreview';

// Simple debounce utility function
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  
  return React.useMemo(() => {
    const debouncedFunction = (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    };
    
    // Add cancel method
    (debouncedFunction as any).cancel = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    
    return debouncedFunction as T;
  }, [callback, delay]);
}

// Typen für die Daten
interface Mietfach {
  id: string;
  name: string;
  beschreibung: string;
  preis: number;
  groesse: string;
  standort: string;
}

interface Tag {
  id: string;
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
  };
  
  // Tag-basiertes System
  tags: Tag[];
  businessDetails: BusinessDetails;
  location: Location;
  
  slogan: string;
  website: string;
  socialMedia: {
    facebook: string;
    instagram: string;
  };
  mietfaecher: Mietfach[];
  verifyStatus: 'verified' | 'pending' | 'unverified';
  registrationStatus: 'trial_active' | 'active' | 'preregistered';
  registrationDate: string;
}

interface VendorFilters {
  search: string;
  tags: string[]; // Tag-IDs oder Slugs
  standorte: string[];
  verifyStatus: string;
  registrationStatus: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface AvailableFilters {
  tags: Tag[]; // Verwendete Tags
  allTags: Tag[]; // Alle verfügbaren Tags
  standorte: string[];
  verifyStatuses: string[];
  registrationStatuses: string[];
}

const DirektvermarkterUebersichtPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [direktvermarkter, setDirektvermarkter] = useState<Direktvermarkter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  
  // URL parameters state management
  const getInitialFilters = (): VendorFilters => {
    const params = new URLSearchParams(location.search);
    return {
      search: params.get('search') || '',
      tags: params.get('tags')?.split(',').filter(Boolean) || [],
      standorte: params.get('standorte')?.split(',').filter(Boolean) || [],
      verifyStatus: params.get('verifyStatus') || '',
      registrationStatus: params.get('registrationStatus') || '',
      sortBy: params.get('sortBy') || 'name',
      sortOrder: (params.get('sortOrder') as 'asc' | 'desc') || 'asc',
      page: parseInt(params.get('page') || '1') || 1
    };
  };
  
  const [filters, setFilters] = useState<VendorFilters>(getInitialFilters());

  // Update URL when filters change
  const updateURL = useCallback((newFilters: VendorFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.tags.length > 0) params.set('tags', newFilters.tags.join(','));
    if (newFilters.standorte.length > 0) params.set('standorte', newFilters.standorte.join(','));
    if (newFilters.verifyStatus) params.set('verifyStatus', newFilters.verifyStatus);
    if (newFilters.registrationStatus) params.set('registrationStatus', newFilters.registrationStatus);
    if (newFilters.sortBy !== 'name') params.set('sortBy', newFilters.sortBy);
    if (newFilters.sortOrder !== 'asc') params.set('sortOrder', newFilters.sortOrder);
    if (newFilters.page > 1) params.set('page', newFilters.page.toString());
    
    const newSearch = params.toString();
    navigate({ search: newSearch }, { replace: true });
  }, [navigate]);
  
  // Update filters and URL
  const updateFilters = useCallback((newFilters: Partial<VendorFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }; // Reset to page 1 when filters change
    setFilters(updatedFilters);
    updateURL(updatedFilters);
  }, [filters, updateURL]);
  
  // Debounced search to reduce API calls
  const debouncedSearch = useDebounce((searchTerm: string) => {
    updateFilters({ search: searchTerm });
  }, 300);

  // Load data with filters
  const fetchData = useCallback(async (currentFilters: VendorFilters) => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      const params = new URLSearchParams();
      if (currentFilters.search) params.set('search', currentFilters.search);
      if (currentFilters.tags.length > 0) params.set('tags', currentFilters.tags.join(','));
      if (currentFilters.standorte.length > 0) params.set('standorte', currentFilters.standorte.join(','));
      if (currentFilters.verifyStatus) params.set('verifyStatus', currentFilters.verifyStatus);
      if (currentFilters.registrationStatus) params.set('registrationStatus', currentFilters.registrationStatus);
      params.set('sortBy', currentFilters.sortBy);
      params.set('sortOrder', currentFilters.sortOrder);
      params.set('page', currentFilters.page.toString());
      params.set('limit', '20'); // Fixed page size
      
      const response = await axios.get(`${apiUrl}/vendor-auth/public/profiles?${params}`);
      
      if (response.data.success) {
        setDirektvermarkter(response.data.vendors);
        setPagination(response.data.pagination);
        setAvailableFilters(response.data.availableFilters);
        setError(null);
      } else {
        console.error('API Fehler:', response.data.message);
        setError('Die Direktvermarkter-Daten konnten nicht geladen werden.');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Daten:', err);
      setError('Die Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load data when filters change
  useEffect(() => {
    fetchData(filters);
  }, [filters, fetchData]);
  
  // Update filters when URL changes (browser back/forward)
  useEffect(() => {
    const newFilters = getInitialFilters();
    setFilters(newFilters);
  }, [location.search]);

  // Event handlers
  
  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    updateFilters({ tags: newTags });
  };
  
  const handleStandortToggle = (standort: string) => {
    const newStandorte = filters.standorte.includes(standort)
      ? filters.standorte.filter(s => s !== standort)
      : [...filters.standorte, standort];
    updateFilters({ standorte: newStandorte });
  };
  
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value })); // Update immediately for UI
    debouncedSearch(value); // Debounced API call
  };
  
  const clearAllFilters = () => {
    const clearedFilters: VendorFilters = {
      search: '',
      tags: [],
      standorte: [],
      verifyStatus: '',
      registrationStatus: '',
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1
    };
    setFilters(clearedFilters);
    updateURL(clearedFilters);
  };
  
  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage });
  };
  
  // Clean up debounced function
  useEffect(() => {
    return () => {
      if (debouncedSearch && (debouncedSearch as any).cancel) {
        (debouncedSearch as any).cancel();
      }
    };
  }, [debouncedSearch]);

  // Helper functions
  const getVerifyStatusLabel = (status: string) => {
    switch (status) {
      case 'verified': return 'Verifiziert';
      case 'pending': return 'Prüfung läuft';
      case 'unverified': return 'Nicht verifiziert';
      default: return status;
    }
  };
  
  const getRegistrationStatusLabel = (status: string) => {
    switch (status) {
      case 'trial_active': return 'Testphase aktiv';
      case 'active': return 'Aktiv';
      case 'preregistered': return 'Vorangemeldet';
      default: return status;
    }
  };
  
  const hasActiveFilters = filters.search || filters.tags.length > 0 || filters.standorte.length > 0 || filters.verifyStatus || filters.registrationStatus;
  
  if (loading && direktvermarkter.length === 0) {
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <SlidersHorizontal className="w-5 h-5 text-primary mr-2" />
            <h2 className="text-lg font-semibold">Filter und Suche</h2>
            {pagination && (
              <span className="ml-4 text-sm text-gray-600">
                {pagination.totalCount} {pagination.totalCount === 1 ? 'Direktvermarkter' : 'Direktvermarkter'} gefunden
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                Alle Filter zurücksetzen
              </button>
            )}
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="md:hidden flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
            >
              {isFiltersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isFiltersExpanded ? 'Weniger' : 'Mehr'} Filter
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Suchfeld */}
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Suche nach Name, Unternehmen oder Beschreibung
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                placeholder="Suchbegriff eingeben..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {filters.search && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          
          {/* Sortierung */}
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
              Sortierung
            </label>
            <select
              id="sort"
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                updateFilters({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
              }}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="unternehmen-asc">Unternehmen (A-Z)</option>
              <option value="unternehmen-desc">Unternehmen (Z-A)</option>
              <option value="registrationDate-desc">Neueste zuerst</option>
              <option value="registrationDate-asc">Älteste zuerst</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={filters.verifyStatus}
              onChange={(e) => updateFilters({ verifyStatus: e.target.value })}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Alle Status</option>
              {availableFilters?.verifyStatuses.map(status => (
                <option key={status} value={status}>{getVerifyStatusLabel(status)}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Erweiterte Filter */}
        <div className={`mt-6 ${isFiltersExpanded || (typeof window !== 'undefined' && window.innerWidth >= 768) ? 'block' : 'hidden'} md:block`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tags Filter (NEU) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produktarten (Tags) {filters.tags.length > 0 && `(${filters.tags.length} ausgewählt)`}
              </label>
              
              {/* Mobile: Dropdown */}
              <div className="md:hidden">
                <select
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      handleTagToggle(value);
                    }
                  }}
                  value=""
                >
                  <option value="">Tag auswählen...</option>
                  {availableFilters?.allTags?.filter(tag => tag.category === 'product').map(tag => (
                    <option key={tag.id} value={tag.slug}>
                      {tag.name} {filters.tags.includes(tag.slug) ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Desktop: Tag Badges */}
              <div className="hidden md:block max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                <div className="flex flex-wrap gap-2">
                  {availableFilters?.allTags?.filter(tag => tag.category === 'product').map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.slug)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filters.tags.includes(tag.slug)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag.icon && <span className="mr-1">{tag.icon}</span>}
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Selected Tags Display */}
              {filters.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {filters.tags.map(tagSlug => {
                    const tag = availableFilters?.allTags?.find(t => t.slug === tagSlug);
                    return (
                      <span
                        key={tagSlug}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700"
                      >
                        {tag?.icon && <span className="mr-1">{tag.icon}</span>}
                        {tag?.name || tagSlug}
                        <button
                          type="button"
                          onClick={() => handleTagToggle(tagSlug)}
                          className="ml-1.5 h-3.5 w-3.5 rounded-full inline-flex items-center justify-center text-green-400 hover:bg-green-200 hover:text-green-600 focus:outline-none"
                        >
                          <span className="sr-only">Entfernen</span>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Standorte Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Standorte {filters.standorte.length > 0 && `(${filters.standorte.length} ausgewählt)`}
              </label>
              
              {/* Mobile: Dropdown */}
              <div className="md:hidden">
                <select
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      handleStandortToggle(value);
                    }
                  }}
                  value=""
                >
                  <option value="">Standort auswählen...</option>
                  {availableFilters?.standorte.map(standort => (
                    <option key={standort} value={standort}>
                      {standort} {filters.standorte.includes(standort) ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Desktop: Checkboxes */}
              <div className="hidden md:block max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                <div className="space-y-2">
                  {availableFilters?.standorte.map(standort => (
                    <div key={standort} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`standort-${standort}`}
                        checked={filters.standorte.includes(standort)}
                        onChange={() => handleStandortToggle(standort)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor={`standort-${standort}`} className="ml-2 block text-sm text-gray-700">
                        {standort}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Selected Locations Display */}
              {filters.standorte.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {filters.standorte.map(standort => (
                    <span
                      key={standort}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      {standort}
                      <button
                        type="button"
                        onClick={() => handleStandortToggle(standort)}
                        className="ml-1.5 h-3.5 w-3.5 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none"
                      >
                        <span className="sr-only">Entfernen</span>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Ergebnisliste */}
      {direktvermarkter.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          {loading ? (
            <div className="flex justify-center items-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-lg text-gray-600">Lade Direktvermarkter...</span>
            </div>
          ) : hasActiveFilters ? (
            <div>
              <p className="text-lg text-gray-600 mb-4">Keine Direktvermarkter gefunden, die Ihren Filterkriterien entsprechen.</p>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                Filter zurücksetzen
              </button>
            </div>
          ) : (
            <VendorListPreview />
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {direktvermarkter.map(dv => (
              <div key={dv.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-gray-200">
                  {dv.bannerBild ? (
                    <img 
                      src={resolveImageUrl(dv.bannerBild)} 
                      alt={`${dv.unternehmen} Banner`} 
                      className="w-full h-full object-cover"
                    />
                  ) : dv.profilBild ? (
                    <img 
                      src={resolveImageUrl(dv.profilBild)} 
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
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      dv.verifyStatus === 'verified' ? 'bg-green-100 text-green-800' :
                      dv.verifyStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getVerifyStatusLabel(dv.verifyStatus)}
                    </span>
                  </div>
                  
                  {/* Profilbild - unten links */}
                  <div className="absolute bottom-3 left-3">
                    {dv.profilBild ? (
                      <img 
                        src={resolveImageUrl(dv.profilBild)} 
                        alt={dv.name} 
                        className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border-2 border-white shadow-md bg-gray-200 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Tags Badge */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {/* Tags */}
                      {dv.tags && dv.tags.slice(0, 3).map(tag => (
                        <span key={`tag-${tag.id}`} className="inline-block px-2 py-1 text-xs text-white bg-blue-500/80 rounded-full">
                          {tag.name}
                        </span>
                      ))}
                      
                      {/* Show overflow indicator if there are more items */}
                      {(dv.tags?.length || 0) > 3 && (
                        <span className="inline-block px-2 py-1 text-xs text-white bg-gray-500/60 rounded-full">
                          +{(dv.tags?.length || 0) - 3}
                        </span>
                      )}
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
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Seite {pagination.currentPage} von {pagination.totalPages}
                {' '}({pagination.totalCount} {pagination.totalCount === 1 ? 'Ergebnis' : 'Ergebnisse'})
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zurück
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, pagination.currentPage - 2) + i;
                    if (pageNum > pagination.totalPages) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          pageNum === pagination.currentPage
                            ? 'bg-primary text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DirektvermarkterUebersichtPage;