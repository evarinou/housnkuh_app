import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import VendorLayout from '../../components/vendor/VendorLayout';

interface Mietfach {
  _id: string;
  bezeichnung: string;
  typ: string;
}

interface Service {
  mietfach: Mietfach;
  mietbeginn: string;
  mietende: string;
  monatspreis: number;
  status: 'aktiv' | 'beendet';
}

interface Vertrag {
  id: string;
  datum: string;
  status: string;
  services: Service[];
  gesamtpreis: number;
}

const VendorContractsPage: React.FC = () => {
  const { user } = useVendorAuth();
  const [vertraege, setVertraege] = useState<Vertrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    try {
      const token = localStorage.getItem('vendorToken');
      const response = await fetch(`http://localhost:4000/api/vendor-auth/contracts/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Verträge');
      }

      const data = await response.json();
      setVertraege(data.vertraege);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchContracts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <VendorLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Meine Verträge</h1>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-orange"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          ) : vertraege.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
              <p className="text-gray-600 mb-4">Sie haben noch keine Verträge.</p>
              <Link 
                to="/mieten" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-orange hover:bg-orange-600"
              >
                Mietfach buchen
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {vertraege.map((vertrag) => (
                <div key={vertrag.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                          Vertrag vom {formatDate(vertrag.datum)}
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                          Vertragsnummer: {vertrag.id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vertrag.status === 'aktiv' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {vertrag.status}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mietfach
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Typ
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mietbeginn
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mietende
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monatspreis
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vertrag.services.map((service, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {service.mietfach.bezeichnung}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {service.mietfach.typ}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(service.mietbeginn)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(service.mietende)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(service.monatspreis)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                service.status === 'aktiv' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {service.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                            Gesamtpreis pro Monat:
                          </td>
                          <td className="px-6 py-3 text-sm font-bold text-gray-900">
                            {formatCurrency(vertrag.gesamtpreis)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorContractsPage;