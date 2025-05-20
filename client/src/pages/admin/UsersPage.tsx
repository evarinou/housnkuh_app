// client/src/pages/admin/UsersPage.tsx
import React, { useState, useEffect } from 'react';
import { User, Search, Filter, Edit, Trash2, Plus, UserCheck, UserX, ShieldCheck } from 'lucide-react';
import axios from 'axios';

interface UserData {
  _id: string;
  username: string;
  name?: string;
  email: string;
  isAdmin: boolean;
  isVendor: boolean;
  isActive: boolean;
  createdAt: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'vendor' | 'regular'>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  
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
      createdAt: '2023-02-15T00:00:00.000Z'
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
  
  // Daten vom Server abrufen
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Hier später durch API-Aufruf ersetzen
        // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        // const response = await axios.get(`${apiUrl}/admin/users`);
        
        // Mock-Daten verwenden
        setTimeout(() => {
          setUsers(mockUsers);
          setFilteredUsers(mockUsers);
          setIsLoading(false);
        }, 500);
      } catch (err) {
        setError('Ein Fehler ist aufgetreten beim Laden der Benutzer');
        setIsLoading(false);
      }
    };
    
    fetchUsers();
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
  }, [users, filter, searchTerm]);
  
  // Benutzer löschen
  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }
    
    try {
      // Hier später durch API-Aufruf ersetzen
      // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      // await axios.delete(`${apiUrl}/admin/users/${id}`);
      
      // Mock-Implementation
      setUsers(prev => prev.filter(user => user._id !== id));
    } catch (err) {
      alert('Fehler beim Löschen des Benutzers');
    }
  };
  
  // Benutzer Status ändern
  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      // Hier später durch API-Aufruf ersetzen
      // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      // await axios.patch(`${apiUrl}/admin/users/${id}`, { isActive: !currentStatus });
      
      // Mock-Implementation
      setUsers(prev => 
        prev.map(user => 
          user._id === id ? { ...user, isActive: !currentStatus } : user
        )
      );
    } catch (err) {
      alert('Fehler beim Ändern des Benutzerstatus');
    }
  };
  
  // Benutzer bearbeiten (Modal öffnen)
  const handleEditUser = (user: UserData) => {
    setCurrentUser(user);
    setShowEditUserModal(true);
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
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
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
        
        <div className="flex items-center space-x-1">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md ${
              filter === 'all' 
                ? 'bg-secondary text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('admin')}
            className={`px-3 py-1 rounded-md ${
              filter === 'admin' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Administratoren
          </button>
          <button
            onClick={() => setFilter('vendor')}
            className={`px-3 py-1 rounded-md ${
              filter === 'vendor' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Direktvermarkter
          </button>
          <button
            onClick={() => setFilter('regular')}
            className={`px-3 py-1 rounded-md ${
              filter === 'regular' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Normale Benutzer
          </button>
        </div>
      </div>
      
      {/* Benutzer-Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Direktvermarkter
                        </span>
                      )}
                      {!user.isAdmin && !user.isVendor && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Benutzer
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
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
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
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
    </div>
  );
};

export default UsersPage;