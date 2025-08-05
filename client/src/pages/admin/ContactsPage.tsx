/**
 * @file ContactsPage.tsx
 * @purpose Contact request management interface for admin operations and customer communication tracking
 * @created 2025-01-15
 * @modified 2025-08-04
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * @interface Contact
 * @description Data structure for contact request information
 */
interface Contact {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * @component ContactsPage
 * @description Contact request management interface with read/unread tracking, filtering, and administrative actions
 * @complexity HIGH - Complex state management, authentication flow, filtering logic, and real-time status updates
 * @returns {JSX.Element} Complete contact management interface with list view, detail view, and administrative functions
 */
const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'resolved'>('all');
  
  const { isAuthenticated, user, token } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Sicherstellen, dass nur Admins Zugriff haben
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/admin/login');
      return;
    }
    
    // Kontaktanfragen laden
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, navigate]);
  
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      const response = await axios.get(`${apiUrl}/contact/admin`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setContacts(response.data.data);
      } else {
        setError('Fehler beim Laden der Kontaktanfragen');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kontaktanfragen:', err);
      setError('Fehler beim Laden der Kontaktanfragen');
    } finally {
      setLoading(false);
    }
  };
  
  const handleContactClick = async (contact: Contact) => {
    setSelectedContact(contact);
    
    // Wenn die Anfrage noch nicht gelesen wurde, als gelesen markieren
    if (!contact.isRead) {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        
        await axios.put(`${apiUrl}/contact/admin/${contact._id}`, {
          isRead: true
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Aktualisierte Kontaktliste laden
        fetchContacts();
      } catch (err) {
        console.error('Fehler beim Markieren als gelesen:', err);
      }
    }
  };
  
  const toggleResolvedStatus = async (contactId: string, currentStatus: boolean) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      await axios.put(`${apiUrl}/contact/admin/${contactId}`, {
        isResolved: !currentStatus
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Aktualisierte Kontaktliste laden
      fetchContacts();
      
      // Wenn der ausgewählte Kontakt aktualisiert wurde, diesen ebenfalls aktualisieren
      if (selectedContact && selectedContact._id === contactId) {
        setSelectedContact({
          ...selectedContact,
          isResolved: !currentStatus
        });
      }
    } catch (err) {
      console.error('Fehler beim Ändern des Status:', err);
    }
  };
  
  const deleteContact = async (contactId: string) => {
    if (!window.confirm('Möchten Sie diese Kontaktanfrage wirklich löschen?')) {
      return;
    }
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      await axios.delete(`${apiUrl}/contact/admin/${contactId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Aktualisierte Kontaktliste laden
      fetchContacts();
      
      // Wenn der gelöschte Kontakt ausgewählt war, Auswahl aufheben
      if (selectedContact && selectedContact._id === contactId) {
        setSelectedContact(null);
      }
    } catch (err) {
      console.error('Fehler beim Löschen der Kontaktanfrage:', err);
    }
  };
  
  // Filtern und Suchen
  const filteredContacts = contacts.filter(contact => {
    // Nach Status filtern
    if (filterStatus === 'unread' && contact.isRead) return false;
    if (filterStatus === 'resolved' && !contact.isResolved) return false;
    
    // Nach Suchbegriff filtern
    if (searchTerm.trim() === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.name.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower) ||
      contact.subject.toLowerCase().includes(searchLower) ||
      contact.message.toLowerCase().includes(searchLower) ||
      (contact.phone && contact.phone.includes(searchTerm))
    );
  });
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-primary-900 mb-6">Kontaktanfragen verwalten</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Suchen..."
            className="w-full p-2 border border-gray-300 rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="w-full md:w-1/3">
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">Alle Anfragen</option>
            <option value="unread">Ungelesene Anfragen</option>
            <option value="resolved">Erledigte Anfragen</option>
          </select>
        </div>
        
        <div className="w-full md:w-1/3">
          <button
            className="bg-primary text-white px-4 py-2 rounded-md w-full"
            onClick={() => fetchContacts()}
          >
            Aktualisieren
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Linke Spalte - Kontaktliste */}
        <div className="md:col-span-1 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Anfragen ({filteredContacts.length})</h2>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-600">Laden...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Keine Kontaktanfragen gefunden</p>
          ) : (
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {filteredContacts.map((contact) => (
                <div
                  key={contact._id}
                  className={`py-3 px-2 cursor-pointer hover:bg-gray-50 ${
                    !contact.isRead ? 'font-semibold' : ''
                  } ${selectedContact?._id === contact._id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="truncate font-medium">{contact.name}</div>
                    <div className="text-xs text-gray-500">{formatDate(contact.createdAt)}</div>
                  </div>
                  <div className="text-sm truncate text-gray-600">{contact.subject}</div>
                  <div className="flex gap-2 mt-1">
                    {!contact.isRead && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Neu
                      </span>
                    )}
                    {contact.isResolved && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Erledigt
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Rechte Spalte - Detailansicht */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-md p-4">
          {selectedContact ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{selectedContact.subject}</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleResolvedStatus(selectedContact._id, selectedContact.isResolved)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      selectedContact.isResolved
                        ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {selectedContact.isResolved ? 'Als offen markieren' : 'Als erledigt markieren'}
                  </button>
                  <button
                    onClick={() => deleteContact(selectedContact._id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    Löschen
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Von:</p>
                    <p className="font-medium">{selectedContact.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">E-Mail:</p>
                    <p className="font-medium">
                      <a href={`mailto:${selectedContact.email}`} className="text-blue-600 hover:underline">
                        {selectedContact.email}
                      </a>
                    </p>
                  </div>
                  
                  {selectedContact.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Telefon:</p>
                      <p className="font-medium">
                        <a href={`tel:${selectedContact.phone}`} className="text-blue-600 hover:underline">
                          {selectedContact.phone}
                        </a>
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-gray-600">Datum:</p>
                    <p className="font-medium">{formatDate(selectedContact.createdAt)}</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Nachricht:</h3>
                <div className="bg-gray-50 rounded-md p-4 whitespace-pre-wrap">
                  {selectedContact.message}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-6">
                <div>
                  <a
                    href={`mailto:${selectedContact.email}?subject=Re: ${selectedContact.subject}`}
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-700"
                  >
                    Per E-Mail antworten
                  </a>
                </div>
                <div className="text-sm text-gray-500">
                  {selectedContact.isRead ? 'Gelesen' : 'Ungelesen'} • 
                  {selectedContact.isResolved ? ' Erledigt' : ' Offen'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Keine Anfrage ausgewählt</h3>
              <p className="mt-1 text-gray-500">Wählen Sie eine Kontaktanfrage aus der Liste aus, um die Details anzuzeigen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;