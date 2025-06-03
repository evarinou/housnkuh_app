import React, { useState, useEffect } from 'react';
// import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Check, X, Users, Trophy, TrendingUp } from 'lucide-react';

interface VendorContestEntry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  guessedVendors: string[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContestStats {
  totalEntries: number;
  unreadEntries: number;
  topGuesses: { vendor: string; count: number }[];
}

export default function VendorContestPage() {
  // const { user } = useAuth();
  const [entries, setEntries] = useState<VendorContestEntry[]>([]);
  const [stats, setStats] = useState<ContestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<VendorContestEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'entries' | 'stats'>('entries');

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, []);

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/vendor-contest`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Contest-Einträge');
      }

      const data = await response.json();
      setEntries(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/vendor-contest/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Statistiken');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      console.error('Fehler beim Laden der Statistiken:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/vendor-contest/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isRead: true })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren');
      }

      // Update local state
      setEntries(entries.map(entry => 
        entry._id === id ? { ...entry, isRead: true } : entry
      ));
      
      // Update stats
      if (stats) {
        setStats({
          ...stats,
          unreadEntries: stats.unreadEntries - 1
        });
      }
    } catch (err) {
      console.error('Fehler beim Markieren als gelesen:', err);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!window.confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/vendor-contest/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Löschen');
      }

      // Update local state
      setEntries(entries.filter(entry => entry._id !== id));
      setSelectedEntry(null);
      
      // Refresh stats
      fetchStats();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  const viewDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/vendor-contest/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Details');
      }

      const data = await response.json();
      setSelectedEntry(data.data);
      
      // Update local state to mark as read
      setEntries(entries.map(entry => 
        entry._id === id ? { ...entry, isRead: true } : entry
      ));
      
      // Update stats
      if (stats && !entries.find(e => e._id === id)?.isRead) {
        setStats({
          ...stats,
          unreadEntries: stats.unreadEntries - 1
        });
      }
    } catch (err) {
      console.error('Fehler beim Laden der Details:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <div className="flex items-center">
          <AlertCircle className="mr-2" size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Contest Verwaltung</h1>
        {stats && (
          <div className="flex gap-4 text-sm">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              {stats.totalEntries} Einträge gesamt
            </span>
            {stats.unreadEntries > 0 && (
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
                {stats.unreadEntries} ungelesen
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('entries')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'entries'
                ? 'border-primary-orange text-primary-orange'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Einträge
            </div>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-primary-orange text-primary-orange'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={18} />
              Statistiken
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'entries' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Entries List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Contest-Einträge</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {entries.length === 0 ? (
                <p className="px-6 py-4 text-gray-500">Keine Einträge vorhanden</p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry._id}
                    className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                      !entry.isRead ? 'bg-orange-50' : ''
                    }`}
                    onClick={() => viewDetails(entry._id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-medium ${
                            !entry.isRead ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {entry.name}
                          </h3>
                          {!entry.isRead && (
                            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded">
                              Neu
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{entry.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(entry.createdAt).toLocaleString('de-DE')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {entry.guessedVendors.length} Vermutungen
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Entry Details */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Details</h2>
            </div>
            {selectedEntry ? (
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedEntry.name}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">E-Mail</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedEntry.email}</p>
                </div>
                
                {selectedEntry.phone && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Telefon</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedEntry.phone}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Vermutete Direktvermarkter</h3>
                  <ul className="mt-2 space-y-1">
                    {selectedEntry.guessedVendors.map((vendor, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-900">
                        <Trophy className="text-primary-orange" size={16} />
                        {vendor}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Eingereicht am</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedEntry.createdAt).toLocaleString('de-DE')}
                  </p>
                </div>
                
                <div className="flex gap-2 pt-4">
                  {!selectedEntry.isRead && (
                    <button
                      onClick={() => markAsRead(selectedEntry._id)}
                      className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                    >
                      <Check size={16} />
                      Als gelesen markieren
                    </button>
                  )}
                  <button
                    onClick={() => deleteEntry(selectedEntry._id)}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                    Löschen
                  </button>
                </div>
              </div>
            ) : (
              <p className="p-6 text-gray-500">Wählen Sie einen Eintrag aus, um Details anzuzeigen</p>
            )}
          </div>
        </div>
      ) : (
        /* Statistics Tab */
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Contest Statistiken</h2>
          
          {stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Gesamte Einträge</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEntries}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Ungelesene Einträge</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.unreadEntries}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Verschiedene Vermutungen</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.topGuesses.length}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">Top 10 vermutete Direktvermarkter</h3>
                <div className="space-y-2">
                  {stats.topGuesses.map((guess, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                        <span className="text-sm font-medium text-gray-900">{guess.vendor}</span>
                      </div>
                      <span className="bg-primary-orange text-white text-sm px-3 py-1 rounded-full">
                        {guess.count} {guess.count === 1 ? 'Vermutung' : 'Vermutungen'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}