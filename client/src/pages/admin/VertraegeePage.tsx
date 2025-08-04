// client/src/pages/admin/VertraegeePage.tsx
import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Edit, Eye, Download, Plus, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import axios from 'axios';

interface Vertrag {
  _id: string;
  vertragsnummer: string;
  kunde: {
    _id: string;
    name: string;
    email: string;
  };
  mietfaecher: Array<{
    _id: string;
    name: string;
    typ: string;
    preis: number;
  }>;
  startdatum: string;
  enddatum: string;
  gesamtpreis: number;
  monthlyBreakdown?: {
    mietfaecherCosts: number;
    zusatzleistungenCosts: number;
    subtotal: number;
    discount: number;
    discountAmount: number;
    total: number;
  };
  zusatzleistungen?: {
    lagerservice: boolean;
    versandservice: boolean;
  };
  zusatzleistungen_kosten?: {
    lagerservice_monatlich: number;
    versandservice_monatlich: number;
  };
  discount?: number;
  provision: number;
  status: 'aktiv' | 'ausstehend' | 'beendet' | 'gekuendigt';
  zahlungsart: string;
  zahlungsrhythmus: string;
  createdAt: string;
  updatedAt: string;
}

const VertraegeePage: React.FC = () => {
  const [vertraege, setVertraege] = useState<Vertrag[]>([]);
  const [filteredVertraege, setFilteredVertraege] = useState<Vertrag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aktiv' | 'ausstehend' | 'beendet' | 'gekuendigt'>('all');
  const [showVertragDetailsModal, setShowVertragDetailsModal] = useState(false);
  const [showAddVertragModal, setShowAddVertragModal] = useState(false);
  const [currentVertrag, setCurrentVertrag] = useState<Vertrag | null>(null);
  
  // Mock Daten für die Entwicklung
  /* const mockVertraege: Vertrag[] = [
    {
      _id: '1',
      vertragsnummer: 'V2023-001',
      kunde: {
        _id: 'k1',
        name: 'Max Mustermann',
        email: 'max@example.com'
      },
      mietfaecher: [
        {
          _id: 'm1',
          name: 'Regal A1',
          typ: 'regal',
          preis: 100
        }
      ],
      startdatum: '2023-01-01T00:00:00.000Z',
      enddatum: '2023-12-31T00:00:00.000Z',
      gesamtpreis: 1200,
      provision: 5,
      status: 'aktiv',
      zahlungsart: 'Überweisung',
      zahlungsrhythmus: 'monatlich',
      createdAt: '2022-12-15T00:00:00.000Z',
      updatedAt: '2022-12-15T00:00:00.000Z'
    },
    {
      _id: '2',
      vertragsnummer: 'V2023-002',
      kunde: {
        _id: 'k2',
        name: 'Erika Musterfrau',
        email: 'erika@example.com'
      },
      mietfaecher: [
        {
          _id: 'm2',
          name: 'Kühlung B3',
          typ: 'kuehlregal',
          preis: 150
        },
        {
          _id: 'm3',
          name: 'Regal D5',
          typ: 'regal',
          preis: 120
        }
      ],
      startdatum: '2023-02-01T00:00:00.000Z',
      enddatum: '2023-07-31T00:00:00.000Z',
      gesamtpreis: 1620,
      provision: 5,
      status: 'ausstehend',
      zahlungsart: 'Lastschrift',
      zahlungsrhythmus: 'monatlich',
      createdAt: '2023-01-20T00:00:00.000Z',
      updatedAt: '2023-01-20T00:00:00.000Z'
    },
    {
      _id: '3',
      vertragsnummer: 'V2022-015',
      kunde: {
        _id: 'k3',
        name: 'Hans Schmidt',
        email: 'hans@example.com'
      },
      mietfaecher: [
        {
          _id: 'm4',
          name: 'Vitrine C2',
          typ: 'vitrine',
          preis: 200
        }
      ],
      startdatum: '2022-10-01T00:00:00.000Z',
      enddatum: '2023-03-31T00:00:00.000Z',
      gesamtpreis: 1200,
      provision: 5,
      status: 'beendet',
      zahlungsart: 'Überweisung',
      zahlungsrhythmus: 'vierteljährlich',
      createdAt: '2022-09-15T00:00:00.000Z',
      updatedAt: '2023-04-01T00:00:00.000Z'
    },
    {
      _id: '4',
      vertragsnummer: 'V2023-008',
      kunde: {
        _id: 'k4',
        name: 'Lisa Meyer',
        email: 'lisa@example.com'
      },
      mietfaecher: [
        {
          _id: 'm5',
          name: 'Regal E2',
          typ: 'regal',
          preis: 110
        }
      ],
      startdatum: '2023-03-01T00:00:00.000Z',
      enddatum: '2024-02-29T00:00:00.000Z',
      gesamtpreis: 1320,
      provision: 5,
      status: 'gekuendigt',
      zahlungsart: 'Lastschrift',
      zahlungsrhythmus: 'monatlich',
      createdAt: '2023-02-15T00:00:00.000Z',
      updatedAt: '2023-05-10T00:00:00.000Z'
    }
  ]; */
  
  // Daten vom Server abrufen
  useEffect(() => {
    const fetchVertraege = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // const token = localStorage.getItem('adminToken');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        
        const response = await axios.get(`${apiUrl}/vertraege`);
        
        if (response.data.success) {
          setVertraege(response.data.vertraege);
          setFilteredVertraege(response.data.vertraege);
        } else {
          throw new Error(response.data.message || 'Unbekannter Fehler');
        }
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error fetching vertraege:', err);
        console.error('Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          url: err.config?.url
        });
        setError(`Fehler ${err.response?.status || 'unbekannt'}: ${err.response?.data?.message || err.message}`);
        setIsLoading(false);
      }
    };
    
    fetchVertraege();
  }, []);
  
  // Filter und Suche anwenden
  useEffect(() => {
    let result = [...vertraege];
    
    // Nach Status filtern
    if (statusFilter !== 'all') {
      result = result.filter(vertrag => vertrag.status === statusFilter);
    }
    
    // Nach Suchbegriff filtern
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        vertrag => 
          vertrag.vertragsnummer?.toLowerCase().includes(term) || 
          vertrag.kunde?.name?.toLowerCase().includes(term) || 
          vertrag.kunde?.email?.toLowerCase().includes(term) ||
          vertrag.mietfaecher?.some(m => m?.name?.toLowerCase().includes(term))
      );
    }
    
    setFilteredVertraege(result);
  }, [vertraege, statusFilter, searchTerm]);
  
  // Vertrag Details anzeigen
  const handleShowDetails = (vertrag: Vertrag) => {
    setCurrentVertrag(vertrag);
    setShowVertragDetailsModal(true);
  };
  
  // Status-Badge Style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'aktiv':
        return 'bg-green-100 text-green-800';
      case 'ausstehend':
        return 'bg-yellow-100 text-yellow-800';
      case 'beendet':
        return 'bg-gray-100 text-gray-800';
      case 'gekuendigt':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Status mit Icon
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    // Sicherheitscheck für undefined status
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Unbekannt
        </span>
      );
    }
    
    let icon;
    switch (status) {
      case 'aktiv':
        icon = <CheckCircle className="h-3 w-3 mr-1" />;
        break;
      case 'ausstehend':
        icon = <Clock className="h-3 w-3 mr-1" />;
        break;
      case 'beendet':
        icon = <FileText className="h-3 w-3 mr-1" />;
        break;
      case 'gekuendigt':
        icon = <XCircle className="h-3 w-3 mr-1" />;
        break;
      default:
        icon = <AlertCircle className="h-3 w-3 mr-1" />;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  // Anzahl der Mietfächer formatieren
  const formatMietfaecherCount = (count: number) => {
    if (count === 1) return "1 Mietfach";
    return `${count} Mietfächer`;
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
        <h1 className="text-2xl font-bold">Verträge verwalten</h1>
        
        <button
          onClick={() => setShowAddVertragModal(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Vertrag erstellen
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
            placeholder="Nach Vertragsnummer, Kunde oder Mietfach suchen..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        
        <div className="flex items-center space-x-1">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md ${
              statusFilter === 'all' 
                ? 'bg-secondary text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setStatusFilter('aktiv')}
            className={`px-3 py-1 rounded-md ${
              statusFilter === 'aktiv' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Aktiv
          </button>
          <button
            onClick={() => setStatusFilter('ausstehend')}
            className={`px-3 py-1 rounded-md ${
              statusFilter === 'ausstehend' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Ausstehend
          </button>
          <button
            onClick={() => setStatusFilter('beendet')}
            className={`px-3 py-1 rounded-md ${
              statusFilter === 'beendet' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Beendet
          </button>
          <button
            onClick={() => setStatusFilter('gekuendigt')}
            className={`px-3 py-1 rounded-md ${
              statusFilter === 'gekuendigt' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Gekündigt
          </button>
        </div>
      </div>
      
      {/* Verträge-Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vertrag
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kunde
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mietfächer
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Laufzeit
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preis
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVertraege.length > 0 ? (
              filteredVertraege.map((vertrag) => (
                <tr key={vertrag._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vertrag.vertragsnummer}
                    </div>
                    <div className="text-sm text-gray-500">
                      Erstellt: {new Date(vertrag.createdAt).toLocaleDateString('de-DE')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vertrag.kunde?.name || 'Unbekannt'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {vertrag.kunde?.email || 'Keine E-Mail'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatMietfaecherCount(vertrag.mietfaecher?.length || 0)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {vertrag.mietfaecher?.map(m => m?.name || 'Unbekannt').join(', ') || 'Keine Mietfächer'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      Von: {new Date(vertrag.startdatum).toLocaleDateString('de-DE')}
                    </div>
                    <div className="text-sm text-gray-500">
                      Bis: {new Date(vertrag.enddatum).toLocaleDateString('de-DE')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={vertrag.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {(vertrag.gesamtpreis || 0).toFixed(2)}€
                    </div>
                    <div className="text-sm text-gray-500">
                      {vertrag.zahlungsrhythmus}, {vertrag.zahlungsart}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleShowDetails(vertrag)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Details anzeigen"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Vertrag bearbeiten"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        className="text-gray-600 hover:text-gray-900"
                        title="Vertrag herunterladen"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Keine Verträge gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Vertrag Details Modal */}
      {showVertragDetailsModal && currentVertrag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Vertrag: {currentVertrag.vertragsnummer}</h2>
                <div className="mt-1">
                  <StatusBadge status={currentVertrag.status} />
                </div>
              </div>
              <button
                onClick={() => setShowVertragDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Kundendaten */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Kundendaten</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Name:</span>
                    <p className="font-medium">{currentVertrag.kunde?.name || 'Unbekannt'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">E-Mail:</span>
                    <p className="font-medium">{currentVertrag.kunde?.email || 'Keine E-Mail'}</p>
                  </div>
                  <div className="pt-2">
                    <button className="text-primary hover:underline text-sm">Alle Kundendaten anzeigen</button>
                  </div>
                </div>
              </div>
              
              {/* Vertragsdaten */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Vertragsdaten</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Erstellt am:</span>
                    <p className="font-medium">{new Date(currentVertrag.createdAt).toLocaleDateString('de-DE')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Laufzeit:</span>
                    <p className="font-medium">
                      {new Date(currentVertrag.startdatum).toLocaleDateString('de-DE')} - {new Date(currentVertrag.enddatum).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Zahlungsweise:</span>
                    <p className="font-medium">{currentVertrag.zahlungsrhythmus}, per {currentVertrag.zahlungsart}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mietfächer */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Gemietete Flächen</h3>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preis/Monat</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentVertrag.mietfaecher?.map(mietfach => (
                      <tr key={mietfach?._id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{mietfach?.name || 'Unbekannt'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{mietfach?.typ || 'Unbekannt'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{(mietfach?.preis || 0).toFixed(2)}€</td>
                      </tr>
                    )) || []}
                    
                    {/* Zusatzleistungen Rows */}
                    {currentVertrag.zusatzleistungen?.lagerservice && (
                      <tr>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">📦 Lagerservice</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">zusatzleistung</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{(currentVertrag.zusatzleistungen_kosten?.lagerservice_monatlich || 20).toFixed(2)}€</td>
                      </tr>
                    )}
                    {currentVertrag.zusatzleistungen?.versandservice && (
                      <tr>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">🚚 Versandservice</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">zusatzleistung</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{(currentVertrag.zusatzleistungen_kosten?.versandservice_monatlich || 5).toFixed(2)}€</td>
                      </tr>
                    )}
                    
                    {/* Subtotal if discount exists */}
                    {(currentVertrag.discount || 0) > 0 && (
                      <>
                        <tr className="bg-gray-50">
                          <td colSpan={2} className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">Zwischensumme:</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{(currentVertrag.monthlyBreakdown?.subtotal || 0).toFixed(2)}€</td>
                        </tr>
                        <tr className="bg-green-50">
                          <td colSpan={2} className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-700 text-right">
                            Rabatt ({((currentVertrag.discount || 0) * 100).toFixed(0)}%):
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700">-{(currentVertrag.monthlyBreakdown?.discountAmount || 0).toFixed(2)}€</td>
                        </tr>
                      </>
                    )}
                    
                    <tr className="bg-gray-100 border-t">
                      <td colSpan={2} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">Gesamtpreis/Monat:</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{(currentVertrag.monthlyBreakdown?.total || 0).toFixed(2)}€</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Finanzübersicht */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Finanzübersicht</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm text-gray-500 uppercase mb-2">Vertragswert</h4>
                  <p className="text-2xl font-bold text-gray-900">{(currentVertrag.gesamtpreis || 0).toFixed(2)}€</p>
                  <p className="text-sm text-gray-500">Gesamtlaufzeit</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm text-gray-500 uppercase mb-2">Provision</h4>
                  <p className="text-2xl font-bold text-gray-900">{currentVertrag.provision || 0}%</p>
                  <p className="text-sm text-gray-500">auf Verkäufe</p>
                </div>
              </div>
            </div>
            
            {/* Aktionen */}
            <div className="flex justify-between border-t pt-4">
              <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md">
                Vertrag drucken
              </button>
              <div className="space-x-2">
                <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md">
                  Vertrag bearbeiten
                </button>
                <button
                  onClick={() => setShowVertragDetailsModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Vertrag Modal (Placeholder) */}
      {showAddVertragModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Neuen Vertrag erstellen</h2>
            <p className="text-gray-500 mb-4">Diese Funktion wird in einer zukünftigen Version implementiert.</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddVertragModal(false)}
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

export default VertraegeePage;