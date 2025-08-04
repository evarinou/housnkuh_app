// client/src/pages/admin/MietfaecherPage.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { Package, Search, Edit, Trash2, Plus, CheckCircle, XCircle, Tag, X, Save } from 'lucide-react';
import axios from 'axios';

// Frontend-Darstellung eines Mietfachs
interface Mietfach {
  _id: string;
  name: string;         // Entspricht 'bezeichnung' im Backend
  beschreibung: string; // Optional im Backend, aber für Frontend-Konsistenz als required
  typ: string;
  groesse: {            // Optional im Backend, aber für Frontend-Konsistenz als required
    flaeche: number;
    einheit: string;
  };
  verfuegbar: boolean;  // Optional im Backend, aber für Frontend-Konsistenz als required
  standort: string;     // Optional im Backend, aber für Frontend-Konsistenz als required
  features: string[];   // Optional im Backend, aber für Frontend-Konsistenz als required
  createdAt: string;
  // Sprint S12_M11_Mietfaecher_Seeding_Cleanup - Manual creation tracking
  creationSource?: 'manual' | 'import' | 'seed';
  createdBy?: string;
  belegungen?: Belegung[]; // Vertragsinformationen
  istBelegt?: boolean;     // Aktueller Belegungsstatus
}

interface Belegung {
  vertragId: string;
  user: {
    _id: string;
    username?: string;
    kontakt?: {
      name: string;
      email: string;
    };
  };
  mietbeginn: string;
  mietende?: string;
  monatspreis: number;
  status: 'aktiv' | 'beendet';
}

// Backend-Repräsentation eines Mietfachs für API-Kommunikation
interface MietfachAPI {
  _id?: string;
  bezeichnung: string;  // Entspricht 'name' im Frontend
  typ: string;
  beschreibung?: string;
  groesse?: {
    flaeche: number;
    einheit: string;
  };
  verfuegbar?: boolean;
  standort?: string;
  features?: string[];
  createdAt?: string;
  updatedAt?: string;
  belegungen?: Belegung[];
  istBelegt?: boolean;
}

const MietfaecherPage: React.FC = () => {
  const [mietfaecher, setMietfaecher] = useState<Mietfach[]>([]);
  const [filteredMietfaecher, setFilteredMietfaecher] = useState<Mietfach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'regal' | 'kuehl' | 'gefrier' | 'schaufenster' | 'sonstiges'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentMietfach, setCurrentMietfach] = useState<Mietfach | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  
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
      verfuegbar: true,
      standort: 'Eingangsbereich',
      features: ['Beleuchtet', 'Sichtbar vom Eingang'],
      createdAt: '2023-01-15T00:00:00.000Z'
    },
    {
      _id: '2',
      name: 'Kühlung B3',
      beschreibung: 'Kühlregal für verderbliche Waren',
      typ: 'kuehl',
      groesse: {
        flaeche: 1.5,
        einheit: 'm²'
      },
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
        // Von der API abrufen mit Vertragsinformationen
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        const response = await axios.get(`${apiUrl}/mietfaecher/with-contracts`);
        
        if (response.data && response.data.length > 0) {
          // Echte Daten verwenden, wenn vorhanden, aber Format umwandeln
          console.log('Mietfächer vom Server geladen:', response.data);
          
          // API-Format in Frontend-Format umwandeln
          const convertedMietfaecher: Mietfach[] = response.data.map((m: MietfachAPI) => ({
            _id: m._id || 'temp',
            name: m.bezeichnung,
            beschreibung: m.beschreibung || '',        // Leerer String als Fallback
            typ: m.typ,
            groesse: m.groesse || {                    // Default-Objekt als Fallback
              flaeche: 1,
              einheit: 'm²'
            },
            belegungen: m.belegungen || [],
            istBelegt: m.istBelegt || false,
            verfuegbar: m.verfuegbar !== undefined ? m.verfuegbar : true,
            standort: m.standort || '',
            features: m.features || [],
            createdAt: m.createdAt || new Date().toISOString(),
            // Sprint S12_M11_Mietfaecher_Seeding_Cleanup - Manual creation tracking
            creationSource: (m as any).creationSource || 'manual',
            createdBy: (m as any).createdBy
          }));
          
          setMietfaecher(convertedMietfaecher);
          setFilteredMietfaecher(convertedMietfaecher);
        } else {
          // Fallback auf Mock-Daten, wenn keine Daten vom Server
          console.log('Keine Mietfächer auf dem Server, verwende Mock-Daten');
          setMietfaecher(mockMietfaecher);
          setFilteredMietfaecher(mockMietfaecher);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Mietfächer:', error);
        // Fallback auf Mock-Daten bei Fehler
        setMietfaecher(mockMietfaecher);
        setFilteredMietfaecher(mockMietfaecher);
        setError('Ein Fehler ist aufgetreten beim Laden der Mietfächer vom Server. Zeige Mock-Daten an.');
        setIsLoading(false);
      }
    };
    
    fetchMietfaecher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!window.confirm('Möchtest du dieses Mietfach wirklich löschen?')) {
      return;
    }
    
    try {
      // Prüfen, ob es eine temporäre ID ist (für Mockdaten)
      if (id.startsWith('temp-')) {
        // Lokales Mietfach (Mock) löschen
        setMietfaecher(prev => prev.filter(mietfach => mietfach._id !== id));
        return;
      }
      
      // Über die API löschen
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      await axios.delete(`${apiUrl}/mietfaecher/${id}`);
      
      // Aus dem lokalen State entfernen
      setMietfaecher(prev => prev.filter(mietfach => mietfach._id !== id));
      
      setSuccessMessage('Mietfach erfolgreich gelöscht');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Fehler beim Löschen des Mietfachs');
      console.error('Error deleting mietfach:', error);
    }
  };
  
  // Verfügbarkeitsstatus ändern
  const toggleVerfuegbarkeit = async (id: string, currentStatus: boolean) => {
    try {
      // Prüfen, ob es eine temporäre ID ist (für Mockdaten)
      if (id.startsWith('temp-')) {
        // Mock-Daten lokal aktualisieren
        setMietfaecher(prev => 
          prev.map(mietfach => 
            mietfach._id === id ? { ...mietfach, verfuegbar: !currentStatus } : mietfach
          )
        );
        return;
      }
      
      // Über die API aktualisieren
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      await axios.put(`${apiUrl}/mietfaecher/${id}`, { 
        verfuegbar: !currentStatus 
      });
      
      // Lokalen State aktualisieren
      setMietfaecher(prev => 
        prev.map(mietfach => 
          mietfach._id === id ? { ...mietfach, verfuegbar: !currentStatus } : mietfach
        )
      );
    } catch (error) {
      setError('Fehler beim Ändern der Verfügbarkeit');
      console.error('Error toggling availability:', error);
    }
  };
  
  // Separate Form states für Add und Edit Modals
  const [addFormData, setAddFormData] = useState<{
    name: string;
    beschreibung: string;
    typ: string;
    flaeche: number;
    einheit: string;
    verfuegbar: boolean;
    standort: string;
    features: string;
  }>({
    name: '',
    beschreibung: '',
    typ: 'regal',
    flaeche: 1,
    einheit: 'm²',
    verfuegbar: true,
    standort: '',
    features: ''
  });
  
  const [editFormData, setEditFormData] = useState<{
    name: string;
    beschreibung: string;
    typ: string;
    flaeche: number;
    einheit: string;
    verfuegbar: boolean;
    standort: string;
    features: string;
  }>({
    name: '',
    beschreibung: '',
    typ: 'regal',
    flaeche: 1,
    einheit: 'm²',
    verfuegbar: true,
    standort: '',
    features: ''
  });
  
  // Form Reset für Add Modal
  const resetAddForm = () => {
    setAddFormData({
      name: '',
      beschreibung: '',
      typ: 'regal',
      flaeche: 1,
      einheit: 'm²',
      verfuegbar: true,
      standort: '',
      features: ''
    });
  };
  
  // Form Reset für Edit Modal
  const resetEditForm = () => {
    setEditFormData({
      name: '',
      beschreibung: '',
      typ: 'regal',
      flaeche: 1,
      einheit: 'm²',
      verfuegbar: true,
      standort: '',
      features: ''
    });
  };
  
  // Mietfach bearbeiten (Modal öffnen)
  const handleEditMietfach = (mietfach: Mietfach) => {
    // State für das neue Mietfach setzen
    setCurrentMietfach(mietfach);
    setEditFormData({
      name: mietfach.name,
      beschreibung: mietfach.beschreibung,
      typ: mietfach.typ,
      flaeche: mietfach.groesse.flaeche,
      einheit: mietfach.groesse.einheit,
      verfuegbar: mietfach.verfuegbar,
      standort: mietfach.standort,
      features: mietfach.features.join(', ')
    });
    
    // Modal öffnen
    setShowEditModal(true);
  };
  
  // Hinzufügen-Modal öffnen
  const handleAddMietfach = () => {
    resetAddForm();
    setShowAddModal(true);
  };
  
  // Entfernt - Fokus wird jetzt direkt in der EditMietfachModal Komponente gehandhabt

  // Änderungen an einem existierenden Mietfach speichern
  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!currentMietfach) return;
    
    try {
      // Features String zu Array konvertieren
      const featuresArray = editFormData.features
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      // Prüfen, ob es eine temporäre ID ist (für Mockdaten)
      if (currentMietfach._id.startsWith('temp-')) {
        // Aktualisiertes Mietfach Objekt für Mockdaten
        const updatedMietfach: Mietfach = {
          ...currentMietfach,
          name: editFormData.name,
          beschreibung: editFormData.beschreibung,
          typ: editFormData.typ,
          groesse: {
            flaeche: editFormData.flaeche,
            einheit: editFormData.einheit
          },
          verfuegbar: editFormData.verfuegbar,
          standort: editFormData.standort,
          features: featuresArray
        };
        
        // Mock-Implementation (lokales State Update)
        setMietfaecher(prev => 
          prev.map(mietfach => 
            mietfach._id === currentMietfach._id ? updatedMietfach : mietfach
          )
        );
        
        // Modal schließen und Success-Message zeigen
        setShowEditModal(false);
        setCurrentMietfach(null);
        resetEditForm();
        setSuccessMessage('Mietfach erfolgreich aktualisiert');
        
        // Success message nach 3 Sekunden ausblenden
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
        return;
      }
      
      // API-Update-Daten vorbereiten - angepasst an das Mongoose-Modell
      // Einfachere Version mit nur den Pflichtfeldern
      const updateData: MietfachAPI = {
        bezeichnung: editFormData.name,
        typ: editFormData.typ
      };
      
      // Optional weitere Felder hinzufügen
      if (editFormData.beschreibung) updateData.beschreibung = editFormData.beschreibung;
      if (editFormData.flaeche) updateData.groesse = {
        flaeche: editFormData.flaeche,
        einheit: editFormData.einheit || 'm²'
      };
      if (editFormData.verfuegbar !== undefined) updateData.verfuegbar = editFormData.verfuegbar;
      if (editFormData.standort) updateData.standort = editFormData.standort;
      if (featuresArray.length > 0) updateData.features = featuresArray;
      
      // Über die API aktualisieren
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      console.log('Updating mietfach via API:', updateData);
      await axios.put(`${apiUrl}/mietfaecher/${currentMietfach._id}`, updateData);
      
      // Aktualisiertes Mietfach Objekt
      const updatedMietfach: Mietfach = {
        ...currentMietfach,
        name: editFormData.name,
        beschreibung: editFormData.beschreibung,
        typ: editFormData.typ,
        groesse: {
          flaeche: editFormData.flaeche,
          einheit: editFormData.einheit
        },
        verfuegbar: editFormData.verfuegbar,
        standort: editFormData.standort,
        features: featuresArray
      };
      
      // Lokalen State aktualisieren
      setMietfaecher(prev => 
        prev.map(mietfach => 
          mietfach._id === currentMietfach._id ? updatedMietfach : mietfach
        )
      );
      
      // Modal schließen und Success-Message zeigen
      setShowEditModal(false);
      setCurrentMietfach(null);
      resetEditForm();
      setSuccessMessage('Mietfach erfolgreich aktualisiert');
      
      // Success message nach 3 Sekunden ausblenden
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (error) {
      setError('Fehler beim Speichern der Änderungen');
      console.error('Error saving changes:', error);
    }
  };
  
  // Neues Mietfach hinzufügen
  const handleAddNewMietfach = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      // Features String zu Array konvertieren
      const featuresArray = addFormData.features
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      // API-Format für das Mietfach (angepasst an das Mongoose-Modell)
      // Einfachere Version mit nur den Pflichtfeldern
      const newMietfachData: MietfachAPI = {
        bezeichnung: addFormData.name,
        typ: addFormData.typ
      };
      
      // Optional weitere Felder hinzufügen
      if (addFormData.beschreibung) newMietfachData.beschreibung = addFormData.beschreibung;
      if (addFormData.flaeche) newMietfachData.groesse = {
        flaeche: addFormData.flaeche,
        einheit: addFormData.einheit || 'm²'
      };
      if (addFormData.verfuegbar !== undefined) newMietfachData.verfuegbar = addFormData.verfuegbar;
      if (addFormData.standort) newMietfachData.standort = addFormData.standort;
      if (featuresArray.length > 0) newMietfachData.features = featuresArray;
      
      // An die API senden
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      console.log('Sending mietfach data to server:', newMietfachData);
      const response = await axios.post(`${apiUrl}/mietfaecher`, newMietfachData);
      
      // Das vom Server zurückgegebene Mietfach mit seiner echten ID verwenden
      const savedMietfach: MietfachAPI = response.data;
      console.log('Received from server:', savedMietfach);
      
      // Das vom Server gespeicherte Mietfach zum State hinzufügen (API-Format in Frontend-Format umwandeln)
      const newMietfach: Mietfach = {
        _id: savedMietfach._id || 'temp',
        name: savedMietfach.bezeichnung, // Dies ist das Pflichtfeld
        beschreibung: savedMietfach.beschreibung || addFormData.beschreibung || '',
        typ: savedMietfach.typ, // Dies ist das Pflichtfeld
        groesse: savedMietfach.groesse || {
          flaeche: addFormData.flaeche || 1,
          einheit: addFormData.einheit || 'm²'
        },
        verfuegbar: savedMietfach.verfuegbar !== undefined ? savedMietfach.verfuegbar : (addFormData.verfuegbar || true),
        standort: savedMietfach.standort || addFormData.standort || '',
        features: savedMietfach.features || featuresArray || [],
        createdAt: savedMietfach.createdAt || new Date().toISOString()
      };
      
      setMietfaecher(prev => [...prev, newMietfach]);
      
      // Modal schließen und Success-Message zeigen
      setShowAddModal(false);
      resetAddForm();
      setSuccessMessage('Mietfach erfolgreich hinzugefügt!');
      
      // Success message nach 3 Sekunden ausblenden
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (error) {
      // Detailliertere Fehlermeldung
      let errorMsg = 'Fehler beim Hinzufügen des Mietfachs';
      
      if (axios.isAxiosError(error) && error.response && error.response.data) {
        // API-Fehlermeldung anzeigen, wenn verfügbar
        const responseData = error.response.data as any;
        errorMsg += ': ' + (responseData.message || JSON.stringify(responseData));
        console.error('Server-Fehler:', responseData);
      }
      
      setError(errorMsg);
      console.error('Error adding mietfach:', error);
    }
  };
  
  // Form Input Handler für Add Modal
  const handleAddInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setAddFormData({
        ...addFormData,
        [name]: checkbox.checked
      });
    } else if (type === 'number') {
      setAddFormData({
        ...addFormData,
        [name]: parseFloat(value)
      });
    } else {
      setAddFormData({
        ...addFormData,
        [name]: value
      });
    }
  };
  
  // Form Input Handler für Edit Modal
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setEditFormData({
        ...editFormData,
        [name]: checkbox.checked
      });
    } else if (type === 'number') {
      setEditFormData({
        ...editFormData,
        [name]: parseFloat(value)
      });
    } else {
      setEditFormData({
        ...editFormData,
        [name]: value
      });
    }
  };
  
  // Mietfach-Typ Anzeige formatieren
  const formatMietfachType = (type: string) => {
    switch (type) {
      case 'regal':
        return 'Regal';
      case 'kuehl':
        return 'Kühlregal';
      case 'gefrier':
        return 'Gefrierregal';
      case 'schaufenster':
        return 'Schaufenster';
      case 'sonstiges':
        return 'Sonstiges';
      default:
        return type;
    }
  };
  
  // Styling nach Mietfach-Typ
  const getMietfachTypeStyle = (type: string) => {
    switch (type) {
      case 'regal':
        return 'bg-blue-100 text-blue-800';
      case 'kuehl':
        return 'bg-cyan-100 text-cyan-800';
      case 'gefrier':
        return 'bg-purple-100 text-purple-800';
      case 'schaufenster':
        return 'bg-yellow-100 text-yellow-800';
      case 'sonstiges':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Sprint S12_M11_Mietfaecher_Seeding_Cleanup - Helper functions for creation source
  const formatCreationSource = (source?: string) => {
    switch (source) {
      case 'manual':
        return 'Manuell';
      case 'import':
        return 'Import';
      case 'seed':
        return 'Automatisch';
      default:
        return 'Manuell';
    }
  };

  const getCreationSourceStyle = (source?: string) => {
    switch (source) {
      case 'manual':
        return 'bg-green-100 text-green-800';
      case 'import':
        return 'bg-blue-100 text-blue-800';
      case 'seed':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-green-100 text-green-800';
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
      
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        </div>
      )}
      
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
                onClick={() => setTypeFilter('kuehl')}
                className={`px-3 py-1 rounded-md ${
                  typeFilter === 'kuehl' 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Kühlregale
              </button>
              <button
                onClick={() => setTypeFilter('gefrier')}
                className={`px-3 py-1 rounded-md ${
                  typeFilter === 'gefrier' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Gefrierregale
              </button>
              <button
                onClick={() => setTypeFilter('schaufenster')}
                className={`px-3 py-1 rounded-md ${
                  typeFilter === 'schaufenster' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Schaufenster
              </button>
              <button
                onClick={() => setTypeFilter('sonstiges')}
                className={`px-3 py-1 rounded-md ${
                  typeFilter === 'sonstiges' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Sonstiges
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
                    <span>Standort:</span>
                    <span className="font-medium">{mietfach.standort}</span>
                  </div>
                </div>
                
                {/* Vertragsinformationen */}
                {mietfach.belegungen && mietfach.belegungen.length > 0 && (
                  <div className="mt-3 mb-3">
                    <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Aktuelle Belegungen</h4>
                    <div className="space-y-2">
                      {mietfach.belegungen
                        .filter(b => b.status === 'aktiv')
                        .map((belegung, idx) => (
                          <div key={idx} className="text-sm bg-blue-50 p-2 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium">
                                  {belegung.user.kontakt?.name || belegung.user.username || 'Unbekannt'}
                                </span>
                                <div className="text-xs text-gray-600">
                                  {new Date(belegung.mietbeginn).toLocaleDateString('de-DE')} - 
                                  {belegung.mietende ? new Date(belegung.mietende).toLocaleDateString('de-DE') : 'unbefristet'}
                                </div>
                              </div>
                              <span className="font-medium text-blue-800">
                                {belegung.monatspreis.toFixed(2)}€/M
                              </span>
                            </div>
                          </div>
                        ))
                      }
                      {mietfach.belegungen.filter(b => b.status === 'aktiv').length === 0 && (
                        <div className="text-sm text-gray-500 italic">Keine aktiven Belegungen</div>
                      )}
                    </div>
                  </div>
                )}
                
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

                {/* Sprint S12_M11_Mietfaecher_Seeding_Cleanup - Creation source tracking */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Erstellt:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCreationSourceStyle(mietfach.creationSource)}`}>
                        {formatCreationSource(mietfach.creationSource)}
                      </span>
                      <span className="text-gray-400">
                        {new Date(mietfach.createdAt).toLocaleDateString('de-DE')}
                      </span>
                    </div>
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
              Passe deine Filtereinstellungen an oder füge neue Mietfächer hinzu.
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
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                  // Force state reset
                  setTimeout(() => resetAddForm(), 50);
                }}
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
                    value={addFormData.name}
                    onChange={handleAddInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    autoComplete="off"
                    placeholder="Mietfach Name eingeben..."
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
                    value={addFormData.typ}
                    onChange={handleAddInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="regal">Regal</option>
                    <option value="kuehl">Kühlregal</option>
                    <option value="gefrier">Gefrierregal</option>
                    <option value="schaufenster">Schaufenster</option>
                    <option value="sonstiges">Sonstiges</option>
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
                    value={addFormData.standort}
                    onChange={handleAddInputChange}
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
                      value={addFormData.flaeche}
                      onChange={handleAddInputChange}
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
                      value={addFormData.einheit}
                      onChange={handleAddInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="m²">m²</option>
                      <option value="m">m</option>
                      <option value="Stück">Stück</option>
                    </select>
                  </div>
                </div>
                
                {/* Verfügbar */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="verfuegbar"
                    name="verfuegbar"
                    checked={addFormData.verfuegbar}
                    onChange={(e) => setAddFormData({...addFormData, verfuegbar: e.target.checked})}
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
                    value={addFormData.beschreibung}
                    onChange={handleAddInputChange}
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
                    value={addFormData.features}
                    onChange={handleAddInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="z.B. Beleuchtet, Abschließbar, Klimatisiert"
                  />
                  <p className="mt-1 text-xs text-gray-500">Gib die Merkmale durch Kommas getrennt ein.</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetAddForm();
                  }}
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
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setCurrentMietfach(null);
                  resetEditForm();
                  // Force state reset
                  setTimeout(() => {
                    resetEditForm();
                    setCurrentMietfach(null);
                  }, 50);
                }}
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
                    value={editFormData.name}
                    onChange={handleEditInputChange}
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
                    value={editFormData.typ}
                    onChange={handleEditInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="regal">Regal</option>
                    <option value="kuehl">Kühlregal</option>
                    <option value="gefrier">Gefrierregal</option>
                    <option value="schaufenster">Schaufenster</option>
                    <option value="sonstiges">Sonstiges</option>
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
                    value={editFormData.standort}
                    onChange={handleEditInputChange}
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
                      value={editFormData.flaeche}
                      onChange={handleEditInputChange}
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
                      value={editFormData.einheit}
                      onChange={handleEditInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="m²">m²</option>
                      <option value="m">m</option>
                      <option value="Stück">Stück</option>
                    </select>
                  </div>
                </div>
                
                {/* Verfügbar */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-verfuegbar"
                    name="verfuegbar"
                    checked={editFormData.verfuegbar}
                    onChange={handleEditInputChange}
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
                    value={editFormData.beschreibung}
                    onChange={handleEditInputChange}
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
                    value={editFormData.features}
                    onChange={handleEditInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="z.B. Beleuchtet, Abschließbar, Klimatisiert"
                  />
                  <p className="mt-1 text-xs text-gray-500">Gib die Merkmale durch Kommas getrennt ein.</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setCurrentMietfach(null);
                    resetEditForm();
                  }}
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