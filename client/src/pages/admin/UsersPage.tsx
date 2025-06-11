// client/src/pages/admin/UsersPage.tsx
import React, { useState, useEffect } from 'react';
import { User, Search, Filter, Edit, Trash2, Plus, UserCheck, UserX, Eye, EyeOff, Building, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import VendorDetailModal from '../../components/admin/VendorDetailModal';

interface UserData {
  _id: string;
  username: string;
  name?: string;
  email: string;
  isAdmin: boolean;
  isVendor: boolean;
  isActive: boolean;
  createdAt: string;
  isPubliclyVisible?: boolean;
  registrationStatus?: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'vendor' | 'regular'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'preregistered' | 'inactive'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Vendor Detail Modal states
  const [showVendorDetailModal, setShowVendorDetailModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  // const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'pending' | 'unverified'>('all');
  
  // Notification helper
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };
  
  // Vendor Detail Modal helper
  const openVendorDetailModal = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setShowVendorDetailModal(true);
  };
  
  // Get verification status badge for vendors
  const getVerificationBadge = (user: UserData) => {
    if (!user.isVendor) return null;
    
    // Note: We'd need to extend UserData interface or fetch this from vendor profile
    // For now, using mock logic based on registration status
    const verifyStatus = user.registrationStatus === 'active' ? 'verified' : 
                        user.registrationStatus === 'trial_active' ? 'pending' : 'unverified';
    
    const statusConfig = {
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Verifiziert' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Prüfung' },
      unverified: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Nicht verifiziert' }
    };
    
    const config = statusConfig[verifyStatus as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };
  
  // Daten vom Server abrufen
  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${apiUrl}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsers(response.data.users || []);
      setFilteredUsers(response.data.users || []);
      setIsLoading(false);
    } catch (err) {
      // Fallback auf Mock-Daten bei Fehler
      console.error('Fehler beim Laden der Benutzer:', err);
      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
      setIsLoading(false);
    }
  };

  // Mock Daten für die Entwicklung
  const mockUsers: UserData[] = [
    {
      _id: '1',
      username: 'admin.user',
      name: 'Admin User',
      email: 'admin@housnkuh.de',
      isAdmin: true,
      isVendor: false,
      isActive: true,
      createdAt: '2023-01-01T00:00:00.000Z'
    },
    {
      _id: '2',
      username: 'vendor.example',
      name: 'Beispiel Vermarkter',
      email: 'vendor@example.com',
      isAdmin: false,
      isVendor: true,
      isActive: true,
      createdAt: '2023-02-15T00:00:00.000Z',
      isPubliclyVisible: true,
      registrationStatus: 'active'
    },
    {
      _id: '3',
      username: 'regular.user',
      name: 'Normaler Nutzer',
      email: 'user@example.com',
      isAdmin: false,
      isVendor: false,
      isActive: true,
      createdAt: '2023-03-20T00:00:00.000Z'
    },
    {
      _id: '4',
      username: 'inactive.user',
      name: 'Inaktiver Nutzer',
      email: 'inactive@example.com',
      isAdmin: false,
      isVendor: false,
      isActive: false,
      createdAt: '2023-04-10T00:00:00.000Z'
    }
  ];
  
  // Initial load
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Filter und Suche anwenden
  useEffect(() => {
    let result = [...users];
    
    // Nach Typ filtern
    if (filter !== 'all') {
      if (filter === 'admin') {
        result = result.filter(user => user.isAdmin);
      } else if (filter === 'vendor') {
        result = result.filter(user => user.isVendor);
      } else if (filter === 'regular') {
        result = result.filter(user => !user.isAdmin && !user.isVendor);
      }
    }
    
    // Nach Registrierungsstatus filtern
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        result = result.filter(user => user.isActive && (!user.registrationStatus || user.registrationStatus === 'active'));
      } else if (statusFilter === 'preregistered') {
        result = result.filter(user => user.registrationStatus === 'preregistered');
      } else if (statusFilter === 'inactive') {
        result = result.filter(user => !user.isActive);
      }
    }
    
    // Nach Sichtbarkeit filtern (nur für Vendors)
    if (visibilityFilter !== 'all') {
      if (visibilityFilter === 'visible') {
        result = result.filter(user => !user.isVendor || user.isPubliclyVisible);
      } else if (visibilityFilter === 'hidden') {
        result = result.filter(user => user.isVendor && !user.isPubliclyVisible);
      }
    }
    
    // Nach Suchbegriff filtern
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        user => 
          (user.name?.toLowerCase().includes(term) || false) || 
          user.email.toLowerCase().includes(term) ||
          user.username.toLowerCase().includes(term)
      );
    }
    
    setFilteredUsers(result);
  }, [users, filter, statusFilter, visibilityFilter, searchTerm]);
  
  // Benutzer löschen
  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${apiUrl}/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsers(prev => prev.filter(user => user._id !== id));
    } catch (err) {
      alert('Fehler beim Löschen des Benutzers');
    }
  };
  
  // Benutzer Status ändern
  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      await axios.patch(`${apiUrl}/admin/users/${id}`, 
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUsers(prev => 
        prev.map(user => 
          user._id === id ? { ...user, isActive: !currentStatus } : user
        )
      );
    } catch (err) {
      alert('Fehler beim Ändern des Benutzerstatus');
    }
  };
  
  // Vendor Sichtbarkeit ändern
  const toggleVendorVisibility = async (id: string, currentVisibility: boolean) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      await axios.patch(`${apiUrl}/admin/vendors/${id}/visibility`, 
        { isPubliclyVisible: !currentVisibility },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUsers(prev => 
        prev.map(user => 
          user._id === id ? { ...user, isPubliclyVisible: !currentVisibility } : user
        )
      );
      
      const user = users.find(u => u._id === id);
      const userName = user?.name || user?.email || 'Vendor';
      showNotification('success', `${userName} ${!currentVisibility ? 'sichtbar' : 'versteckt'} gemacht`);
    } catch (err: any) {
      console.error('Fehler beim Ändern der Sichtbarkeit:', err);
      const errorMessage = err.response?.data?.message || 'Fehler beim Ändern der Sichtbarkeit';
      showNotification('error', errorMessage);
    }
  };
  
  // Benutzer bearbeiten (Modal öffnen)
  const handleEditUser = (user: UserData) => {
    setCurrentUser(user);
    setShowEditUserModal(true);
  };
  
  // Benutzer auswählen/abwählen
  const handleUserSelect = (userId: string, selected: boolean) => {
    if (selected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };
  
  // Alle Benutzer auswählen/abwählen
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(filteredUsers.map(user => user._id));
    } else {
      setSelectedUsers([]);
    }
  };
  
  // Bulk-Aktion: Sichtbarkeit ändern
  const handleBulkVisibilityChange = async (visible: boolean) => {
    // Nur Vendors für Bulk-Visibility-Operation filtern
    const vendorIds = selectedUsers.filter(userId => {
      const user = filteredUsers.find(u => u._id === userId);
      return user && user.isVendor;
    });
    
    if (vendorIds.length === 0) {
      alert('Keine Direktvermarkter ausgewählt. Sichtbarkeit kann nur für Direktvermarkter geändert werden.');
      return;
    }
    
    if (!window.confirm(`Möchten Sie die Sichtbarkeit für ${vendorIds.length} Direktvermarkter ändern?`)) {
      return;
    }
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      
      await axios.patch(`${apiUrl}/admin/vendors/bulk-visibility`, 
        { 
          vendorIds: vendorIds,
          isPubliclyVisible: visible 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUsers(prev => 
        prev.map(user => 
          vendorIds.includes(user._id) 
            ? { ...user, isPubliclyVisible: visible } 
            : user
        )
      );
      
      setSelectedUsers([]);
      showNotification('success', `Sichtbarkeit für ${vendorIds.length} Direktvermarkter erfolgreich ${visible ? 'aktiviert' : 'deaktiviert'}`);
    } catch (err: any) {
      console.error('Fehler beim Ändern der Sichtbarkeit:', err);
      const errorMessage = err.response?.data?.message || 'Fehler beim Ändern der Sichtbarkeit';
      showNotification('error', errorMessage);
    }
  };
  
  // Bulk-Aktion: Status ändern
  const handleBulkStatusChange = async (active: boolean) => {
    if (!window.confirm(`Möchten Sie ${selectedUsers.length} Benutzer ${active ? 'aktivieren' : 'deaktivieren'}?`)) {
      return;
    }
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      
      const promises = selectedUsers.map(userId =>
        axios.patch(`${apiUrl}/admin/users/${userId}`, 
          { isActive: active },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      
      await Promise.all(promises);
      
      setUsers(prev => 
        prev.map(user => 
          selectedUsers.includes(user._id) 
            ? { ...user, isActive: active } 
            : user
        )
      );
      
      setSelectedUsers([]);
      alert(`${selectedUsers.length} Benutzer erfolgreich ${active ? 'aktiviert' : 'deaktiviert'}`);
    } catch (err) {
      alert('Fehler beim Ändern des Status');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-700">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-red-800 text-sm font-medium"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }
  
  return (
    <div>
      {/* Notification Banner */}
      {notification && (
        <div className={`mb-4 p-4 rounded-md ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
        
        <button
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Benutzer hinzufügen
        </button>
      </div>
      
      {/* Filter- und Suchleiste */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nach Namen, E-Mail oder Benutzernamen suchen..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedUsers.length} ausgewählt
                {(() => {
                  const selectedVendorCount = selectedUsers.filter(userId => {
                    const user = filteredUsers.find(u => u._id === userId);
                    return user && user.isVendor;
                  }).length;
                  return selectedVendorCount > 0 ? ` (${selectedVendorCount} Direktvermarkter)` : '';
                })()}
              </span>
              
              {/* Vendor-specific bulk actions */}
              {selectedUsers.some(userId => {
                const user = filteredUsers.find(u => u._id === userId);
                return user && user.isVendor;
              }) && (
                <>
                  <button
                    onClick={() => handleBulkVisibilityChange(true)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 text-sm"
                    title="Nur Direktvermarkter werden sichtbar gemacht"
                  >
                    Sichtbar machen
                  </button>
                  <button
                    onClick={() => handleBulkVisibilityChange(false)}
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm"
                    title="Nur Direktvermarkter werden versteckt"
                  >
                    Verstecken
                  </button>
                </>
              )}
              
              {/* General bulk actions */}
              <button
                onClick={() => handleBulkStatusChange(true)}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 text-sm"
              >
                Aktivieren
              </button>
              <button
                onClick={() => handleBulkStatusChange(false)}
                className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 text-sm"
              >
                Deaktivieren
              </button>
            </div>
          )}
        </div>
        
        {/* Benutzertyp Filter */}
        <div className="flex items-center space-x-1">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <span className="text-sm font-medium text-gray-700 mr-2">Typ:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'all' 
                ? 'bg-secondary text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('admin')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'admin' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Administratoren
          </button>
          <button
            onClick={() => setFilter('vendor')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'vendor' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Direktvermarkter
          </button>
          <button
            onClick={() => setFilter('regular')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'regular' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Normale Benutzer
          </button>
        </div>
        
        {/* Status Filter */}
        <div className="flex items-center space-x-1">
          <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md text-sm ${
              statusFilter === 'all' 
                ? 'bg-secondary text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-md text-sm ${
              statusFilter === 'active' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Aktiv
          </button>
          <button
            onClick={() => setStatusFilter('preregistered')}
            className={`px-3 py-1 rounded-md text-sm ${
              statusFilter === 'preregistered' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Vorregistriert
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1 rounded-md text-sm ${
              statusFilter === 'inactive' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Inaktiv
          </button>
        </div>
        
        {/* Sichtbarkeits Filter (nur für Vendors) */}
        {filter === 'vendor' && (
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-700 mr-2">Sichtbarkeit:</span>
            <button
              onClick={() => setVisibilityFilter('all')}
              className={`px-3 py-1 rounded-md text-sm ${
                visibilityFilter === 'all' 
                  ? 'bg-secondary text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setVisibilityFilter('visible')}
              className={`px-3 py-1 rounded-md text-sm ${
                visibilityFilter === 'visible' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Sichtbar
            </button>
            <button
              onClick={() => setVisibilityFilter('hidden')}
              className={`px-3 py-1 rounded-md text-sm ${
                visibilityFilter === 'hidden' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Versteckt
            </button>
          </div>
        )}
      </div>
      
      {/* Benutzer-Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Benutzer
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-Mail
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rolle
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sichtbarkeit
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Erstellt am
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={(e) => handleUserSelect(user._id, e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-gray-100 rounded-full p-2">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || user.username}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      {user.isAdmin && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      )}
                      {user.isVendor && (
                        <div className="flex items-center space-x-1">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Direktvermarkter
                          </span>
                          {/* Verification Status Badge */}
                          {getVerificationBadge(user)}
                        </div>
                      )}
                      {!user.isAdmin && !user.isVendor && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Benutzer
                        </span>
                      )}
                      {user.registrationStatus === 'preregistered' && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                          Vorregistriert
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => toggleUserStatus(user._id, user.isActive)}
                      className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {user.isActive ? (
                        <>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Aktiv
                        </>
                      ) : (
                        <>
                          <UserX className="h-3 w-3 mr-1" />
                          Inaktiv
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isVendor ? (
                      <button 
                        onClick={() => toggleVendorVisibility(user._id, user.isPubliclyVisible || false)}
                        className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full transition-colors ${
                          user.isPubliclyVisible 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                        title={user.isPubliclyVisible ? 'Klicken zum Verstecken' : 'Klicken zum Sichtbar machen'}
                      >
                        {user.isPubliclyVisible ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Öffentlich
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Versteckt
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium text-gray-400">
                        Nicht anwendbar
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {user.isVendor && (
                        <button
                          onClick={() => openVendorDetailModal(user._id)}
                          className="text-green-600 hover:text-green-900"
                          title="Vendor Details ansehen"
                        >
                          <Building className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Benutzer bearbeiten"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Benutzer löschen"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Keine Benutzer gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Add User Modal (Placeholder) */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Neuen Benutzer hinzufügen</h2>
            <p className="text-gray-500 mb-4">Diese Funktion wird in einer zukünftigen Version implementiert.</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit User Modal (Placeholder) */}
      {showEditUserModal && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Benutzer bearbeiten: {currentUser.name || currentUser.username}</h2>
            <p className="text-gray-500 mb-4">Diese Funktion wird in einer zukünftigen Version implementiert.</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Vendor Detail Modal */}
      <VendorDetailModal
        vendorId={selectedVendorId || ''}
        isOpen={showVendorDetailModal}
        onClose={() => {
          setShowVendorDetailModal(false);
          setSelectedVendorId(null);
        }}
        onUpdate={() => {
          // Refresh users list after vendor update
          fetchUsers();
        }}
      />
    </div>
  );
};

export default UsersPage;