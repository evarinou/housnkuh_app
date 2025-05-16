// client/src/pages/admin/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Users, ShoppingBag, Package,  Clock } from 'lucide-react';
import axios from 'axios';

interface DashboardData {
  newsletter: {
    total: number;
    pending: number;
    customer: number;
    vendor: number;
  };
  mietfaecher: number;
  vertraege: number;
  recentSubscribers: Array<{
    _id: string;
    kontakt: {
      name: string;
      email: string;
      newslettertype: string;
    };
    createdAt: string;
  }>;
}

const DashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        const response = await axios.get(`${apiUrl}/admin/dashboard`);
        
        if (response.data.success) {
          setDashboardData(response.data.overview);
        } else {
          setError('Fehler beim Laden der Dashboard-Daten');
        }
      } catch (err) {
        setError('Ein Serverfehler ist aufgetreten');
        console.error('Dashboard error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
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
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Newsletter Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-gray-700 text-lg font-semibold">Newsletter</h2>
              <p className="text-3xl font-bold text-gray-900">{dashboardData?.newsletter.total || 0}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <div>
              <p className="text-gray-500">Kunden</p>
              <p className="font-medium">{dashboardData?.newsletter.customer || 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Direktvermarkter</p>
              <p className="font-medium">{dashboardData?.newsletter.vendor || 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Ausstehend</p>
              <p className="font-medium">{dashboardData?.newsletter.pending || 0}</p>
            </div>
          </div>
        </div>
        
        {/* Mietfächer Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-gray-700 text-lg font-semibold">Mietfächer</h2>
              <p className="text-3xl font-bold text-gray-900">{dashboardData?.mietfaecher || 0}</p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/admin/mietfaecher"
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Details anzeigen →
            </Link>
          </div>
        </div>
        
        {/* Verträge Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-full">
              <ShoppingBag className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-gray-700 text-lg font-semibold">Verträge</h2>
              <p className="text-3xl font-bold text-gray-900">{dashboardData?.vertraege || 0}</p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/admin/vertraege"
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Details anzeigen →
            </Link>
          </div>
        </div>
        
        {/* Weitere Stats - Platzhalter */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-gray-700 text-lg font-semibold">Benutzer</h2>
              <p className="text-3xl font-bold text-gray-900">-</p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/admin/users"
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Details anzeigen →
            </Link>
          </div>
        </div>
      </div>
      
      {/* Neueste Newsletter-Abonnenten */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Neueste Newsletter-Anmeldungen</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {dashboardData?.recentSubscribers && dashboardData.recentSubscribers.length > 0 ? (
            dashboardData.recentSubscribers.map((subscriber) => (
              <div key={subscriber._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{subscriber.kontakt.name}</p>
                    <p className="text-sm text-gray-500">{subscriber.kontakt.email}</p>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      subscriber.kontakt.newslettertype === 'customer' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {subscriber.kontakt.newslettertype === 'customer' ? 'Kunde' : 'Direktvermarkter'}
                    </span>
                    <div className="ml-4 flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(subscriber.createdAt).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-4 text-center text-gray-500">
              Keine Newsletter-Anmeldungen vorhanden
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 bg-gray-50">
          <Link
            to="/admin/newsletter"
            className="text-primary hover:text-primary/80 font-medium"
          >
            Alle Newsletter-Abonnenten anzeigen
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;