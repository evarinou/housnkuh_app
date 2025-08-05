// client/src/pages/admin/DashboardPage.tsx
/**
 * @file DashboardPage.tsx
 * @purpose Admin Dashboard interface displaying system overview with statistics, notifications, and recent activity
 * @created 2025-01-15
 * @modified 2025-08-04
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, Package, ShoppingBag, Clock, Trophy, Users, Calendar } from 'lucide-react';
import axios from 'axios';
import LaunchDayMonitor from '../../components/admin/LaunchDayMonitor';

/**
 * @interface DashboardData
 * @description Data structure for admin dashboard overview containing system statistics and notifications
 */
interface DashboardData {
  newsletter: {
    total: number;
    pending: number;
    customer: number;
    vendor: number;
  };
  mietfaecher: number;
  vertraege: number;
  pendingBookings: number;
  vendorContest?: {
    total: number;
    unread: number;
  };
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

/**
 * @interface StatCardProps
 * @description Props interface for dashboard statistic card component
 */
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  link?: string;
  subtitle?: React.ReactNode;
}

/**
 * @component StatCard
 * @description Reusable dashboard statistic card displaying metrics with icon and optional link
 * @param {StatCardProps} props - Component props
 * @returns {JSX.Element} Formatted statistic card component
 */
const StatCard: React.FC<StatCardProps> = React.memo(({ 
  title, 
  value, 
  icon: Icon, 
  iconBgColor, 
  iconColor, 
  link,
  subtitle 
}) => (
  <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        {subtitle && (
          <div className="mt-3">
            {subtitle}
          </div>
        )}
      </div>
      <div className={`flex-shrink-0 ${iconBgColor} p-3 rounded-full`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
    </div>
    {link && (
      <div className="mt-4">
        <Link
          to={link}
          className="inline-flex items-center text-sm text-primary hover:text-primary/80 font-medium group"
        >
          Details anzeigen
          <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    )}
  </div>
));

/**
 * @component DashboardPage
 * @description Main admin dashboard component displaying system overview, statistics, and recent activity
 * @complexity HIGH - Manages multiple data sources, real-time updates, and complex UI state
 * @returns {JSX.Element} Complete dashboard interface with statistics cards, recent activity, and quick actions
 */
const DashboardPage: React.FC = React.memo(() => {
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
  
  // Newsletter-Statistiken für die Untertitel
  const newsletterSubtitle = (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <div className="text-center">
        <div className="font-semibold text-blue-600">{dashboardData?.newsletter.customer || 0}</div>
        <div className="text-gray-500">Kunden</div>
      </div>
      <div className="text-center">
        <div className="font-semibold text-green-600">{dashboardData?.newsletter.vendor || 0}</div>
        <div className="text-gray-500">Vermarkter</div>
      </div>
      <div className="text-center">
        <div className="font-semibold text-amber-600">{dashboardData?.newsletter.pending || 0}</div>
        <div className="text-gray-500">Ausstehend</div>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Überblick über Ihre housnkuh-Administration</p>
      </div>
      
      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <StatCard
          title="Newsletter"
          value={dashboardData?.newsletter.total || 0}
          icon={Mail}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          link="/admin/newsletter"
          subtitle={newsletterSubtitle}
        />
        
        <StatCard
          title="Mietfächer"
          value={dashboardData?.mietfaecher || 0}
          icon={Package}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          link="/admin/mietfaecher"
        />
        
        <StatCard
          title="Verträge"
          value={dashboardData?.vertraege || 0}
          icon={ShoppingBag}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          link="/admin/vertraege"
        />
        
        <StatCard
          title="Ausstehende Buchungen"
          value={dashboardData?.pendingBookings || 0}
          icon={Clock}
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
          link="/admin/pending-bookings"
        />
        
        <StatCard
          title="Vendor Contest"
          value={dashboardData?.vendorContest?.total || 0}
          icon={Trophy}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          link="/admin/vendor-contest"
          subtitle={
            dashboardData?.vendorContest?.unread ? (
              <span className="text-sm text-yellow-600">
                {dashboardData.vendorContest.unread} ungelesen
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Launch Day Monitor */}
      <LaunchDayMonitor />
      
      {/* Neueste Newsletter-Anmeldungen */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Neueste Newsletter-Anmeldungen</h3>
            <Link
              to="/admin/newsletter"
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Alle anzeigen
            </Link>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {dashboardData?.recentSubscribers && dashboardData.recentSubscribers.length > 0 ? (
            dashboardData.recentSubscribers.map((subscriber) => (
              <div key={subscriber._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {subscriber.kontakt.name || 'Unbekannt'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {subscriber.kontakt.email}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      subscriber.kontakt.newslettertype === 'customer' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {subscriber.kontakt.newslettertype === 'customer' ? 'Kunde' : 'Vermarkter'}
                    </span>
                    <div className="flex items-center text-sm text-gray-400">
                      <Clock className="h-4 w-4 mr-1" />
                      <time dateTime={subscriber.createdAt}>
                        {new Date(subscriber.createdAt).toLocaleDateString('de-DE')}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Keine Newsletter-Anmeldungen vorhanden</p>
              <p className="text-sm text-gray-400 mt-1">
                Neue Anmeldungen werden hier automatisch angezeigt
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Schnelle Aktionen */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Schnelle Aktionen</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/admin/newsletter"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all group"
          >
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-600 group-hover:text-primary" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Newsletter verwalten</p>
                <p className="text-sm text-gray-500">Abonnenten ansehen und verwalten</p>
              </div>
            </div>
          </Link>
          
          <Link
            to="/admin/users"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all group"
          >
            <div className="flex items-center">
              <Users className="h-8 w-8 text-yellow-600 group-hover:text-primary" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Benutzer verwalten</p>
                <p className="text-sm text-gray-500">Accounts und Berechtigungen</p>
              </div>
            </div>
          </Link>
          
          <Link
            to="/admin/mietfaecher"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all group"
          >
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-600 group-hover:text-primary" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Mietfächer verwalten</p>
                <p className="text-sm text-gray-500">Verkaufsflächen konfigurieren</p>
              </div>
            </div>
          </Link>
          
          <Link
            to="/admin/settings"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all group"
          >
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600 group-hover:text-primary" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Eröffnungsdatum</p>
                <p className="text-sm text-gray-500">Ladeneröffnung konfigurieren</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
});

export default DashboardPage;