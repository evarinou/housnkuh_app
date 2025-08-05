/**
 * @file NewsletterPage.tsx
 * @purpose Newsletter subscription management interface for admin operations and subscriber analytics
 * @created 2025-01-15
 * @modified 2025-08-04
 */

import React, { useState, useEffect } from 'react';
import { Trash2, Filter, Download, Check, X, Search } from 'lucide-react';
import axios from 'axios';

/**
 * @interface Subscriber
 * @description Data structure for newsletter subscriber information
 */
interface Subscriber {
  _id: string;
  kontakt: {
    name: string;
    email: string;
    newslettertype: string;
    newsletterConfirmed: boolean;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * @component NewsletterPage
 * @description Newsletter subscriber management interface with filtering, search, and CSV export functionality
 * @complexity HIGH - Complex filtering logic, CSV export, async operations, and comprehensive subscriber management
 * @returns {JSX.Element} Complete newsletter management interface with subscriber table and administrative functions
 */
const NewsletterPage: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'customer' | 'vendor'>('all');
  
  // Daten vom Server abrufen
  useEffect(() => {
    const fetchSubscribers = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        const response = await axios.get(`${apiUrl}/admin/newsletter/subscribers`);
        
        if (response.data.success) {
          setSubscribers(response.data.subscribers);
          setFilteredSubscribers(response.data.subscribers);
        } else {
          setError('Fehler beim Laden der Newsletter-Abonnenten');
        }
      } catch (err) {
        setError('Ein Serverfehler ist aufgetreten');
        console.error('Newsletter subscribers error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubscribers();
  }, []);
  
  // Filter und Suche anwenden
  useEffect(() => {
    let result = [...subscribers];
    
    // Nach Typ filtern
    if (filter !== 'all') {
      result = result.filter(sub => sub.kontakt.newslettertype === filter);
    }
    
    // Nach Suchbegriff filtern
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        sub => 
          sub.kontakt.name.toLowerCase().includes(term) || 
          sub.kontakt.email.toLowerCase().includes(term)
      );
    }
    
    setFilteredSubscribers(result);
  }, [subscribers, filter, searchTerm]);
  
  // Abonnent löschen
  const handleDeleteSubscriber = async (id: string) => {
    if (!window.confirm('Möchten Sie diesen Abonnenten wirklich löschen?')) {
      return;
    }
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await axios.delete(`${apiUrl}/admin/newsletter/subscribers/${id}`);
      
      if (response.data.success) {
        // Aus der lokalen Liste entfernen
        setSubscribers(prev => prev.filter(sub => sub._id !== id));
      } else {
        alert('Fehler beim Löschen des Abonnenten.');
      }
    } catch (err) {
      alert('Ein Serverfehler ist aufgetreten.');
      console.error('Delete subscriber error:', err);
    }
  };
  
  // CSV Export
  const exportToCsv = () => {
    // Header für die CSV-Datei
    const headers = ['Name', 'E-Mail', 'Typ', 'Status', 'Angemeldet am'];
    
    // Daten in CSV-Format konvertieren
    const csvData = filteredSubscribers.map(sub => [
      sub.kontakt.name,
      sub.kontakt.email,
      sub.kontakt.newslettertype === 'customer' ? 'Kunde' : 'Direktvermarkter',
      sub.kontakt.status === 'aktiv' ? 'Aktiv' : 'Inaktiv',
      new Date(sub.createdAt).toLocaleDateString('de-DE')
    ]);
    
    // CSV-String erstellen
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // Download starten
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `newsletter-abonnenten_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <h1 className="text-2xl font-bold">Newsletter-Abonnenten</h1>
        
        <div className="flex space-x-3">
          <button
            onClick={exportToCsv}
            className="flex items-center px-4 py-2 bg-secondary text-white rounded-md hover:bg-opacity-90"
          >
            <Download className="h-5 w-5 mr-2" />
            CSV exportieren
          </button>
        </div>
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
            placeholder="Nach Namen oder E-Mail suchen..."
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
            onClick={() => setFilter('customer')}
            className={`px-3 py-1 rounded-md ${
              filter === 'customer' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Kunden
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
        </div>
      </div>
      
      {/* Abonnenten-Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-Mail
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Typ
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Angemeldet am
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSubscribers.length > 0 ? (
              filteredSubscribers.map((subscriber) => (
                <tr key={subscriber._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {subscriber.kontakt.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {subscriber.kontakt.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      subscriber.kontakt.newslettertype === 'customer' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {subscriber.kontakt.newslettertype === 'customer' ? 'Kunde' : 'Direktvermarkter'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {subscriber.kontakt.newsletterConfirmed ? (
                        <Check className="h-5 w-5 text-green-500 mr-1" />
                      ) : (
                        <X className="h-5 w-5 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${
                        subscriber.kontakt.newsletterConfirmed 
                          ? 'text-green-700' 
                          : 'text-red-700'
                      }`}>
                        {subscriber.kontakt.newsletterConfirmed ? 'Bestätigt' : 'Unbestätigt'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(subscriber.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteSubscriber(subscriber._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Keine Abonnenten gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Paginierung könnte hier hinzugefügt werden */}
      </div>
    </div>
  );
};

export default NewsletterPage;