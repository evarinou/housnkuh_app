/**
 * @file VendorDetailModal.tsx
 * @purpose Comprehensive vendor details modal with tabbed interface for vendor management and verification
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Building, Calendar, Eye, EyeOff, Clock, MapPin, Globe, Facebook, Instagram, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

/**
 * Vendor profile data structure for business information
 * @interface VendorProfile
 */
interface VendorProfile {
  unternehmen?: string;
  beschreibung?: string;
  profilBild?: string;
  oeffnungszeiten?: {
    montag?: string;
    dienstag?: string;
    mittwoch?: string;
    donnerstag?: string;
    freitag?: string;
    samstag?: string;
    sonntag?: string;
  };
  kategorien?: string[];
  slogan?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
  };
  verifyStatus?: 'unverified' | 'pending' | 'verified';
}

/**
 * Complete vendor data structure including user info, profile, and trial status
 * @interface VendorData
 */
interface VendorData {
  _id: string;
  username?: string;
  name?: string;
  email: string;
  isAdmin: boolean;
  isVendor: boolean;
  isActive: boolean;
  createdAt: string;
  registrationDate?: string;
  registrationStatus?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  isPubliclyVisible?: boolean;
  kontakt?: {
    name: string;
    email: string;
    telefon?: string;
  };
  adressen?: Array<{
    adresstyp: string;
    strasse: string;
    hausnummer: string;
    plz: string;
    ort: string;
    telefon?: string;
  }>;
  vendorProfile?: VendorProfile;
}

/**
 * Props for the VendorDetailModal component
 * @interface VendorDetailModalProps
 */
interface VendorDetailModalProps {
  vendorId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

/**
 * Comprehensive vendor details modal with tabbed interface for vendor management
 * 
 * Features:
 * - Tabbed interface: Overview, Profile, Addresses, Trial Status
 * - Vendor verification status management with admin controls
 * - Real-time vendor data fetching and display
 * - Social media links and business information display
 * - Trial period tracking and status indicators
 * - Address management and contact information
 * - Loading states and error handling
 * - Responsive design with modal overlay
 * 
 * @param {VendorDetailModalProps} props - Component props
 * @param {string} props.vendorId - ID of vendor to display details for
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {() => void} props.onClose - Callback when modal is closed
 * @param {() => void} [props.onUpdate] - Optional callback when vendor data is updated
 * @returns {JSX.Element|null} Modal component or null when closed
 * 
 * @complexity O(1) - Linear rendering with API calls
 */
const VendorDetailModal: React.FC<VendorDetailModalProps> = ({ vendorId, isOpen, onClose, onUpdate }) => {
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'addresses' | 'trial'>('overview');

  /**
   * Fetches complete vendor details from the API
   * @returns {Promise<void>}
   */
  const fetchVendorDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/users/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setVendor(response.data);
    } catch (err: any) {
      setError('Fehler beim Laden der Vendor-Details');
      console.error('Error fetching vendor details:', err);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (isOpen && vendorId) {
      fetchVendorDetails();
    }
  }, [isOpen, vendorId, fetchVendorDetails]);

  /**
   * Updates vendor verification status via API and local state
   * @param {('verified'|'pending'|'unverified')} newStatus - New verification status
   * @returns {Promise<void>}
   */
  const handleVerificationChange = async (newStatus: 'verified' | 'pending' | 'unverified') => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(`/api/admin/vendors/${vendorId}/verification`, 
        { verifyStatus: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      if (vendor && vendor.vendorProfile) {
        setVendor({
          ...vendor,
          vendorProfile: {
            ...vendor.vendorProfile,
            verifyStatus: newStatus
          }
        });
      }
      
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error updating verification status:', err);
    }
  };

  /**
   * Generates status badge component for verification status
   * @param {string} [status] - Verification status ('verified'|'pending'|'unverified')
   * @returns {JSX.Element} Status badge with icon and color coding
   */
  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Verifiziert' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Prüfung' },
      unverified: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Nicht verifiziert' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unverified;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  /**
   * Generates status badge component for registration status
   * @param {string} [status] - Registration status ('preregistered'|'trial_active'|'trial_expired'|'active'|'cancelled')
   * @returns {JSX.Element} Registration status badge with color coding
   */
  const getRegistrationStatusBadge = (status?: string) => {
    const statusConfig = {
      preregistered: { color: 'bg-blue-100 text-blue-800', label: 'Vorangemeldet' },
      trial_active: { color: 'bg-green-100 text-green-800', label: 'Testphase aktiv' },
      trial_expired: { color: 'bg-red-100 text-red-800', label: 'Testphase abgelaufen' },
      active: { color: 'bg-green-100 text-green-800', label: 'Aktiv' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Gekündigt' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.preregistered;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // const formatDate = (dateString?: string) => {
  //   if (!dateString) return 'Nicht gesetzt';
  //   return new Date(dateString).toLocaleDateString('de-DE');
  // };

  /**
   * Formats date string to German locale date and time
   * @param {string} [dateString] - ISO date string to format
   * @returns {string} Formatted date/time or 'Nicht gesetzt' if empty
   */
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Nicht gesetzt';
    return new Date(dateString).toLocaleString('de-DE');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Building className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Vendor Details</h2>
              <p className="text-sm text-gray-600">
                {vendor?.vendorProfile?.unternehmen || vendor?.kontakt?.name || 'Unbekannter Vendor'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading/Error States */}
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Lade Vendor-Details...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <div className="text-red-600 mb-2">{error}</div>
            <button 
              onClick={fetchVendorDetails}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Content */}
        {vendor && !loading && !error && (
          <>
            {/* Tabs */}
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: 'Übersicht', icon: User },
                  { id: 'profile', label: 'Profil', icon: Building },
                  { id: 'addresses', label: 'Adressen', icon: MapPin },
                  { id: 'trial', label: 'Trial Status', icon: Clock }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Grundinformationen
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>ID:</strong> {vendor._id}</div>
                        <div><strong>Name:</strong> {vendor.kontakt?.name}</div>
                        <div><strong>E-Mail:</strong> {vendor.kontakt?.email}</div>
                        {vendor.kontakt?.telefon && (
                          <div><strong>Telefon:</strong> {vendor.kontakt.telefon}</div>
                        )}
                        <div><strong>Registriert:</strong> {formatDateTime(vendor.createdAt)}</div>
                      </div>
                    </div>

                    {/* Status Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3">Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Verifizierung:</span>
                          {getStatusBadge(vendor.vendorProfile?.verifyStatus)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Registration:</span>
                          {getRegistrationStatusBadge(vendor.registrationStatus)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Sichtbarkeit:</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vendor.isPubliclyVisible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {vendor.isPubliclyVisible ? (
                              <><Eye className="w-3 h-3 mr-1" /> Öffentlich</>
                            ) : (
                              <><EyeOff className="w-3 h-3 mr-1" /> Versteckt</>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Schnellaktionen</h3>
                    <div className="flex flex-wrap gap-3">
                      <select
                        value={vendor.vendorProfile?.verifyStatus || 'unverified'}
                        onChange={(e) => handleVerificationChange(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="unverified">Nicht verifiziert</option>
                        <option value="pending">In Prüfung</option>
                        <option value="verified">Verifiziert</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {vendor.vendorProfile ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-semibold mb-3">Unternehmensdaten</h3>
                          <div className="space-y-2 text-sm">
                            <div><strong>Unternehmen:</strong> {vendor.vendorProfile.unternehmen || 'Nicht angegeben'}</div>
                            <div><strong>Slogan:</strong> {vendor.vendorProfile.slogan || 'Nicht angegeben'}</div>
                            <div><strong>Website:</strong> 
                              {vendor.vendorProfile.website ? (
                                <a href={vendor.vendorProfile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                  <Globe className="w-3 h-3 inline mr-1" />
                                  {vendor.vendorProfile.website}
                                </a>
                              ) : ' Nicht angegeben'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-3">Social Media</h3>
                          <div className="space-y-2 text-sm">
                            <div><strong>Facebook:</strong> 
                              {vendor.vendorProfile.socialMedia?.facebook ? (
                                <a href={vendor.vendorProfile.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                  <Facebook className="w-3 h-3 inline mr-1" />
                                  {vendor.vendorProfile.socialMedia.facebook}
                                </a>
                              ) : ' Nicht angegeben'}
                            </div>
                            <div><strong>Instagram:</strong> 
                              {vendor.vendorProfile.socialMedia?.instagram ? (
                                <a href={vendor.vendorProfile.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                  <Instagram className="w-3 h-3 inline mr-1" />
                                  {vendor.vendorProfile.socialMedia.instagram}
                                </a>
                              ) : ' Nicht angegeben'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {vendor.vendorProfile.beschreibung && (
                        <div>
                          <h3 className="font-semibold mb-3">Beschreibung</h3>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{vendor.vendorProfile.beschreibung}</p>
                        </div>
                      )}

                      {vendor.vendorProfile.kategorien && vendor.vendorProfile.kategorien.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3">Kategorien</h3>
                          <div className="flex flex-wrap gap-2">
                            {vendor.vendorProfile.kategorien.map((kategorie, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {kategorie}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {vendor.vendorProfile.oeffnungszeiten && (
                        <div>
                          <h3 className="font-semibold mb-3">Öffnungszeiten</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(vendor.vendorProfile.oeffnungszeiten).map(([day, time]) => (
                              <div key={day} className="flex justify-between">
                                <span className="capitalize font-medium">{day}:</span>
                                <span>{time || 'Geschlossen'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Building className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Noch kein Vendor-Profil erstellt</p>
                    </div>
                  )}
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <div className="space-y-4">
                  {vendor.adressen && vendor.adressen.length > 0 ? (
                    vendor.adressen.map((adresse, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          {adresse.adresstyp}
                        </h3>
                        <div className="text-sm space-y-1">
                          <div>{adresse.strasse} {adresse.hausnummer}</div>
                          <div>{adresse.plz} {adresse.ort}</div>
                          {adresse.telefon && <div><strong>Tel:</strong> {adresse.telefon}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Keine Adressen hinterlegt</p>
                    </div>
                  )}
                </div>
              )}

              {/* Trial Tab */}
              {activeTab === 'trial' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Registrierung
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Registriert am:</strong> {formatDateTime(vendor.registrationDate)}</div>
                        <div><strong>Status:</strong> {getRegistrationStatusBadge(vendor.registrationStatus)}</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Trial Period
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Start:</strong> {formatDateTime(vendor.trialStartDate)}</div>
                        <div><strong>Ende:</strong> {formatDateTime(vendor.trialEndDate)}</div>
                        {vendor.trialEndDate && (
                          <div><strong>Verbleibend:</strong> 
                            {new Date(vendor.trialEndDate) > new Date() 
                              ? `${Math.ceil((new Date(vendor.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Tage`
                              : 'Abgelaufen'
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VendorDetailModal;