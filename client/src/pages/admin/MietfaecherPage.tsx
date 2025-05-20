// client/src/pages/admin/MietfaecherPage.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { Package, Search, Filter, Edit, Trash2, Plus, CheckCircle, XCircle, Tag, X, Save } from 'lucide-react';
import axios from 'axios';

interface Mietfach {
  _id: string;
  name: string;
  beschreibung: string;
  typ: string;
  groesse: {
    flaeche: number;
    einheit: string;
  };
  preis: number;
  verfuegbar: boolean;
  standort: string;
  features: string[];
  createdAt: string;
}

const MietfaecherPage: React.FC = () => {
  const [mietfaecher, setMietfaecher] = useState<Mietfach[]>([]);
  const [filteredMietfaecher, setFilteredMietfaecher] = useState<Mietfach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'regal' | 'kuehlregal' | 'vitrine'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentMietfach, setCurrentMietfach] = useState<Mietfach | null>(null);
  
  // Mock Daten für die Entwicklung
  const mockMietfaecher: Mietfach[] = [
    {
      _id: '1',
      name: 'Regal A1',
      beschreibung: 'Standardregal im Eingangsbereich',
      typ: 'regal',
      groesse: {
        flaeche: 2,
        einheit: 'm²'
      },
      preis: 100,
      verfuegbar: true,
      standort: 'Eingangsbereich',
      features: ['Beleuchtet', 'Sichtbar vom Eingang'],
      createdAt: '2023-01-15T00:00:00.000Z'
    },
    {
      _id: '2',
      name: 'Kühlung B3',
      beschreibung: 'Kühlregal für verderbliche Waren',
      typ: 'kuehlregal',
      groesse: {
        flaeche: 1.5,
        einheit: 'm²'
      },
      preis: 150,
      verfuegbar: false,
      standort: 'Kühlbereich',
      features: ['Gekühlt (2-8°C)', 'Beleuchtung'],
      createdAt: '2023-02-10T00:00:00.000Z'
    },
    {
      _id: '3',
      name: 'Vitrine C2',
      beschreibung: 'Premiumvitrine für Spezialprodukte',
      typ: 'vitrine',
      groesse: {
        flaeche: 1,
        einheit: 'm²'
      },
      preis: 200,
      verfuegbar: true,
      standort: 'Kassenbereich',
      features: ['Abschließbar', 'Spezialbeleuchtung', 'Temperaturreguliert'],
      createdAt: '2023-03-05T00:00:00.000Z'
    },
    {
      _id: '4',
      name: 'Regal D5',
      beschreibung: 'Standardregal im mittleren Bereich',
      typ: 'regal',
      groesse: {
        flaeche: 2.5,
        einheit: 'm²'
      },
      preis: 120,
      verfuegbar: true,
      standort: 'Mittelgang',
      features: ['Beleuchtet'],
      createdAt: '2023-04-20T00:00:00.000Z'
    }
  ];
  
  // Daten vom Server abrufen
  useEffect(() => {
    const fetchMietfaecher = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Hier später durch API-Aufruf ersetzen
        // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        // const response = await axios.get(`${apiUrl}/admin/mietfaecher`);
        
        // Mock-Daten verwenden
        setTimeout(() => {
          setMietfaecher(mockMietfaecher);
          setFilteredMietfaecher(mockMietfaecher);
          setIsLoading(false);
        }, 500);
      } catch (err) {
        setError('Ein Fehler ist aufgetreten beim Laden der Mietfächer');
        setIsLoading(false);
      }
    };
    
    fetchMietfaecher();
  }, []);
  
  // Filter und Suche anwenden
  useEffect(() => {
    let result = [...mietfaecher];
    
    // Nach Verfügbarkeit filtern
    if (filter !== 'all') {
      if (filter === 'available') {
        result = result.filter(mietfach => mietfach.verfuegbar);
      } else if (filter === 'unavailable') {
        result = result.filter(mietfach => !mietfach.verfuegbar);
      }
    }
    
    // Nach Typ filtern
    if (typeFilter !== 'all') {
      result = result.filter(mietfach => mietfach.typ === typeFilter);
    }
    
    // Nach Suchbegriff filtern
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        mietfach => 
          mietfach.name.toLowerCase().includes(term) || 
          mietfach.beschreibung.toLowerCase().includes(term) ||
          mietfach.standort.toLowerCase().includes(term)
      );
    }
    
    setFilteredMietfaecher(result);
  }, [mietfaecher, filter, typeFilter, searchTerm]);
  
  // Mietfach löschen
  const handleDeleteMietfach = async (id: string) => {
    if (!window.confirm('Möchten Sie dieses Mietfach wirklich löschen?')) {
      return;
    }
    
    try {
      // Hier später durch API-Aufruf ersetzen
      // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      // await axios.delete(`${apiUrl}/admin/mietfaecher/${id}`);
      
      // Mock-Implementation
      setMietfaecher(prev => prev.filter(mietfach => mietfach._id !== id));
    } catch (err) {
      alert('Fehler beim Löschen des Mietfachs');
    }
  };
  
  // Verfügbarkeitsstatus ändern
  const toggleVerfuegbarkeit = async (id: string, currentStatus: boolean) => {
    try {
      // Hier später durch API-Aufruf ersetzen
      // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      // await axios.patch(`${apiUrl}/admin/mietfaecher/${id}`, { verfuegbar: !currentStatus });
      
      // Mock-Implementation
      setMietfaecher(prev => 
        prev.map(mietfach => 
          mietfach._id === id ? { ...mietfach, verfuegbar: !currentStatus } : mietfach
        )
      );
    } catch (err) {
      alert('Fehler beim Ändern der Verfügbarkeit');
    }
  };
  
  // Form state für das Bearbeiten/Hinzufügen eines Mietfachs
  const [formData, setFormData] = useState<{
    name: string;
    beschreibung: string;
    typ: string;
    flaeche: number;
    einheit: string;
    preis: number;
    verfuegbar: boolean;
    standort: string;
    features: string;
  }>({
    name: '',
    beschreibung: '',
    typ: 'regal',
    flaeche: 1,
    einheit: 'm²',
    preis: 100,
    verfuegbar: true,
    standort: '',
    features: ''
  });
  
  // Form Reset und Initialisierung
  const resetForm = () => {
    setFormData({
      name: '',
      beschreibung: '',
      typ: 'regal',
      flaeche: 1,
      einheit: 'm²',
      preis: 100,
      verfuegbar: true,
      standort: '',
      features: ''
    });
  };
  
  // Mietfach bearbeiten (Modal öffnen)
  const handleEditMietfach = (mietfach: Mietfach) => {
    setCurrentMietfach(mietfach);
    setFormData({
      name: mietfach.name,
      beschreibung: mietfach.beschreibung,
      typ: mietfach.typ,
      flaeche: mietfach.groesse.flaeche,
      einheit: mietfach.groesse.einheit,
      preis: mietfach.preis,
      verfuegbar: mietfach.verfuegbar,
      standort: mietfach.standort,
      features: mietfach.features.join(', ')
    });
    setShowEditModal(true);
  };
  
  // Hinzufügen-Modal öffnen
  const handleAddMietfach = () => {
    resetForm();
    setShowAddModal(true);
  };
  
  // Änderungen an einem existierenden Mietfach speichern
  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!currentMietfach) return;
    
    try {
      // Features String zu Array konvertieren
      const featuresArray = formData.features
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      // Aktualisiertes Mietfach Objekt
      const updatedMietfach: Mietfach = {
        ...currentMietfach,
        name: formData.name,
        beschreibung: formData.beschreibung,
        typ: formData.typ,
        groesse: {
          flaeche: formData.flaeche,
          einheit: formData.einheit
        },
        preis: formData.preis,
        verfuegbar: formData.verfuegbar,
        standort: formData.standort,
        features: featuresArray
      };
      
      // Hier später durch API-Aufruf ersetzen
      // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      // await axios.put(`${apiUrl}/admin/mietfaecher/${currentMietfach._id}`, updatedMietfach);
      
      // Mock-Implementation (lokales State Update)
      setMietfaecher(prev => 
        prev.map(mietfach => 
          mietfach._id === currentMietfach._id ? updatedMietfach : mietfach
        )
      );
      
      setShowEditModal(false);
      
      // Erfolgsmeldung könnte hier hinzugefügt werden
      
    } catch (err) {
      alert('Fehler beim Speichern der Änderungen');
      console.error('Error saving changes:', err);
    }
  };
  
  // Neues Mietfach hinzufügen
  const handleAddNewMietfach = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      // Features String zu Array konvertieren
      const featuresArray = formData.features
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      // Neues Mietfach Objekt
      // In einer realen Implementation würde die ID vom Server generiert
      const newMietfach: Mietfach = {
        _id: `temp-${Date.now()}`, // Temporäre ID
        name: formData.name,
        beschreibung: formData.beschreibung,
        typ: formData.typ,
        groesse: {
          flaeche: formData.flaeche,
          einheit: formData.einheit
        },
        preis: formData.preis,
        verfuegbar: formData.verfuegbar,
        standort: formData.standort,
        features: featuresArray,
        createdAt: new Date().toISOString()
      };
      
      // Hier später durch API-Aufruf ersetzen
      // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      // const response = await axios.post(`${apiUrl}/admin/mietfaecher`, newMietfach);
      // const savedMietfach = response.data.mietfach;
      
      // Mock-Implementation (lokales State Update)
      setMietfaecher(prev => [...prev, newMietfach]);
      
      setShowAddModal(false);
      resetForm();
      
      // Erfolgsmeldung könnte hier hinzugefügt werden
      
    } catch (err) {
      alert('Fehler beim Hinzufügen des Mietfachs');
      console.error('Error adding mietfach:', err);
    }
  };
  
  // Form Input Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkbox.checked
      });
    } else if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseFloat(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Mietfach-Typ Anzeige formatieren
  const formatMietfachType = (type: string) => {
    switch (type) {
      case 'regal':
        return 'Regal';
      case 'kuehlregal':
        return 'Kühlregal';
      case 'vitrine':
        return 'Vitrine';
      default:
        return type;
    }
  };
  
  // Styling nach Mietfach-Typ
  const getMietfachTypeStyle = (type: string) => {
    switch (type) {
      case 'regal':
        return 'bg-blue-100 text-blue-800';
      case 'kuehlregal':
        return 'bg-cyan-100 text-cyan-800';
      case 'vitrine':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mietfächer verwalten</h1>
        
        <button
          onClick={handleAddMietfach}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Mietfach hinzufügen
        </button>
      </div>
      
      {/* Filter- und Suchleiste */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Suchfeld */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          
          {/* Verfügbarkeitsfilter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verfügbarkeit</label>
            <div className="flex items-center space-x-1">
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
                onClick={() => setFilter('available')}
                className={`px-3 py-1 rounded-md ${
                  filter === 'available' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Verfügbar
              </button>
              <button
                onClick={() => setFilter('unavailable')}
                className={`px-3 py-1 rounded-md ${
                  filter === 'unavailable' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Belegt
              </button>
            </div>
          </div>
          
          {/* Typfilter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-md ${
                  typeFilter === 'all' 
                    ? 'bg-secondary text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setTypeFilter('regal')}
                className={`px-3 py-1 rounded-md ${
                  typeFilter === 'regal' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Regale
              </button>
              <button
                onClick={() => setTypeFilter('kuehlregal')}
                className={`px-3 py-1 rounded-md ${
                  typeFilter === 'kuehlregal' 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Kühlregale
              </button>
              <button
                onClick={() => setTypeFilter('vitrine')}
                className={`px-3 py-1 rounded-md ${
                  typeFilter === 'vitrine' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Vitrinen
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mietfächer-Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMietfaecher.length > 0 ? (
          filteredMietfaecher.map((mietfach) => (
            <div 
              key={mietfach._id}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header mit Aktionen */}
              <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-gray-500 mr-2" />
                  <h3 className="font-medium text-gray-900">{mietfach.name}</h3>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEditMietfach(mietfach)}
                    className="p-1 text-indigo-600 hover:text-indigo-900 rounded-full hover:bg-indigo-50"
                    title="Bearbeiten"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMietfach(mietfach._id)}
                    className="p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50"
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Inhalt */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMietfachTypeStyle(mietfach.typ)}`}>
                    {formatMietfachType(mietfach.typ)}
                  </span>
                  <button
                    onClick={() => toggleVerfuegbarkeit(mietfach._id, mietfach.verfuegbar)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      mietfach.verfuegbar 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {mietfach.verfuegbar ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verfügbar
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Belegt
                      </>
                    )}
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{mietfach.beschreibung}</p>
                
                <div className="text-sm text-gray-500 space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span>Fläche:</span>
                    <span className="font-medium">{mietfach.groesse.flaeche} {mietfach.groesse.einheit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Preis:</span>
                    <span className="font-medium">{mietfach.preis.toFixed(2)}€ / Monat</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standort:</span>
                    <span className="font-medium">{mietfach.standort}</span>
                  </div>
                </div>
                
                {/* Features */}
                <div className="mt-3">
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {mietfach.features.map((feature, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-800"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Keine Mietfächer gefunden</h3>
            <p className="mt-1 text-sm text-gray-500">
              Passen Sie Ihre Filtereinstellungen an oder fügen Sie neue Mietfächer hinzu.
            </p>
          </div>
        )}
      </div>
      
      {/* Add Mietfach Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Neues Mietfach hinzufügen</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddNewMietfach}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Name */}
                <div className="col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                
                {/* Typ */}
                <div>
                  <label htmlFor="typ" className="block text-sm font-medium text-gray-700 mb-1">
                    Typ *
                  </label>
                  <select
                    id="typ"
                    name="typ"
                    value={formData.typ}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="regal">Regal</option>
                    <option value="kuehlregal">Kühlregal</option>
                    <option value="vitrine">Vitrine</option>
                  </select>
                </div>
                
                {/* Standort */}
                <div>
                  <label htmlFor="standort" className="block text-sm font-medium text-gray-700 mb-1">
                    Standort *
                  </label>
                  <input
                    type="text"
                    id="standort"
                    name="standort"
                    value={formData.standort}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    placeholder="z.B. Eingangsbereich, Mitte, etc."
                  />
                </div>
                
                {/* Fläche und Einheit */}
                <div className="flex space-x-2">
                  <div className="flex-grow">
                    <label htmlFor="flaeche" className="block text-sm font-medium text-gray-700 mb-1">
                      Fläche *
                    </label>
                    <input
                      type="number"
                      id="flaeche"
                      name="flaeche"
                      value={formData.flaeche}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                  <div className="w-24">
                    <label htmlFor="einheit" className="block text-sm font-medium text-gray-700 mb-1">
                      Einheit
                    </label>
                    <select
                      id="einheit"
                      name="einheit"
                      value={formData.einheit}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="m²">m²</option>
                      <option value="m">m</option>
                      <option value="Stück">Stück</option>
                    </select>
                  </div>
                </div>
                
                {/* Preis */}
                <div>
                  <label htmlFor="preis" className="block text-sm font-medium text-gray-700 mb-1">
                    Preis (€/Monat) *
                  </label>
                  <input
                    type="number"
                    id="preis"
                    name="preis"
                    value={formData.preis}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                
                {/* Verfügbar */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="verfuegbar"
                    name="verfuegbar"
                    checked={formData.verfuegbar}
                    onChange={(e) => setFormData({...formData, verfuegbar: e.target.checked})}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="verfuegbar" className="ml-2 block text-sm font-medium text-gray-700">
                    Verfügbar
                  </label>
                </div>
                
                {/* Beschreibung */}
                <div className="col-span-2">
                  <label htmlFor="beschreibung" className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung
                  </label>
                  <textarea
                    id="beschreibung"
                    name="beschreibung"
                    value={formData.beschreibung}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={3}
                  />
                </div>
                
                {/* Features */}
                <div className="col-span-2">
                  <label htmlFor="features" className="block text-sm font-medium text-gray-700 mb-1">
                    Features (durch Kommas getrennt)
                  </label>
                  <input
                    type="text"
                    id="features"
                    name="features"
                    value={formData.features}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="z.B. Beleuchtet, Abschließbar, Klimatisiert"
                  />
                  <p className="mt-1 text-xs text-gray-500">Geben Sie die Merkmale durch Kommas getrennt ein.</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Mietfach Modal */}
      {showEditModal && currentMietfach && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Mietfach bearbeiten: {currentMietfach.name}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveChanges}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Name */}
                <div className="col-span-2">
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                
                {/* Typ */}
                <div>
                  <label htmlFor="edit-typ" className="block text-sm font-medium text-gray-700 mb-1">
                    Typ *
                  </label>
                  <select
                    id="edit-typ"
                    name="typ"
                    value={formData.typ}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="regal">Regal</option>
                    <option value="kuehlregal">Kühlregal</option>
                    <option value="vitrine">Vitrine</option>
                  </select>
                </div>
                
                {/* Standort */}
                <div>
                  <label htmlFor="edit-standort" className="block text-sm font-medium text-gray-700 mb-1">
                    Standort *
                  </label>
                  <input
                    type="text"
                    id="edit-standort"
                    name="standort"
                    value={formData.standort}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    placeholder="z.B. Eingangsbereich, Mitte, etc."
                  />
                </div>
                
                {/* Fläche und Einheit */}
                <div className="flex space-x-2">
                  <div className="flex-grow">
                    <label htmlFor="edit-flaeche" className="block text-sm font-medium text-gray-700 mb-1">
                      Fläche *
                    </label>
                    <input
                      type="number"
                      id="edit-flaeche"
                      name="flaeche"
                      value={formData.flaeche}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                  <div className="w-24">
                    <label htmlFor="edit-einheit" className="block text-sm font-medium text-gray-700 mb-1">
                      Einheit
                    </label>
                    <select
                      id="edit-einheit"
                      name="einheit"
                      value={formData.einheit}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="m²">m²</option>
                      <option value="m">m</option>
                      <option value="Stück">Stück</option>
                    </select>
                  </div>
                </div>
                
                {/* Preis */}
                <div>
                  <label htmlFor="edit-preis" className="block text-sm font-medium text-gray-700 mb-1">
                    Preis (€/Monat) *
                  </label>
                  <input
                    type="number"
                    id="edit-preis"
                    name="preis"
                    value={formData.preis}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                
                {/* Verfügbar */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-verfuegbar"
                    name="verfuegbar"
                    checked={formData.verfuegbar}
                    onChange={(e) => setFormData({...formData, verfuegbar: e.target.checked})}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="edit-verfuegbar" className="ml-2 block text-sm font-medium text-gray-700">
                    Verfügbar
                  </label>
                </div>
                
                {/* Beschreibung */}
                <div className="col-span-2">
                  <label htmlFor="edit-beschreibung" className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung
                  </label>
                  <textarea
                    id="edit-beschreibung"
                    name="beschreibung"
                    value={formData.beschreibung}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={3}
                  />
                </div>
                
                {/* Features */}
                <div className="col-span-2">
                  <label htmlFor="edit-features" className="block text-sm font-medium text-gray-700 mb-1">
                    Features (durch Kommas getrennt)
                  </label>
                  <input
                    type="text"
                    id="edit-features"
                    name="features"
                    value={formData.features}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="z.B. Beleuchtet, Abschließbar, Klimatisiert"
                  />
                  <p className="mt-1 text-xs text-gray-500">Geben Sie die Merkmale durch Kommas getrennt ein.</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Änderungen speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MietfaecherPage;