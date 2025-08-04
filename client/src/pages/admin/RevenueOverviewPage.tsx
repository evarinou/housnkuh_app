import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MonthlyRevenueWidget from '../../components/admin/revenue/MonthlyRevenueWidget';
import RevenueChart from '../../components/admin/revenue/RevenueChart';
import RevenueByUnitTable from '../../components/admin/revenue/RevenueByUnitTable';
import DateRangePicker from '../../components/common/DateRangePicker';
import ExportButton from '../../components/admin/revenue/ExportButton';
import './RevenueOverviewPage.css';

interface RevenueData {
  totalRevenue: number;
  monthlyAverage: number;
  totalActiveContracts: number;
  totalTrialContracts: number;
  occupancyRate: number;
  revenueTrend: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  occupancyTrend: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    contracts: number;
    trialContracts: number;
  }>;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function RevenueOverviewPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1), // Start of year
    endDate: new Date(new Date().getFullYear() + 1, 11, 31) // End of next year for projections
  });
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [showProjections, setShowProjections] = useState(true);
  const [includeTrialRevenue, setIncludeTrialRevenue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenueData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const authToken = localStorage.getItem('adminToken');
      
      if (!authToken) {
        throw new Error('Keine Berechtigung');
      }

      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };

      // Fetch historical overview data with date range
      const overviewUrl = new URL(`${apiUrl}/admin/revenue/overview`);
      overviewUrl.searchParams.append('startDate', dateRange.startDate.toISOString());
      overviewUrl.searchParams.append('endDate', dateRange.endDate.toISOString());
      overviewUrl.searchParams.append('includeTrialRevenue', includeTrialRevenue.toString());
      
      const overviewResponse = await fetch(overviewUrl.toString(), { headers });
      if (!overviewResponse.ok) {
        throw new Error(`Fehler beim Laden der Übersichtsdaten: ${overviewResponse.statusText}`);
      }
      const overviewResult = await overviewResponse.json();
      console.log('🔍 Frontend: Overview API Response:', overviewResult);
      console.log('🔍 Frontend: Overview Data:', overviewResult.data);
      setRevenueData(overviewResult.data);

      // No need to fetch combined data separately anymore - overview API now handles date ranges
    } catch (err) {
      console.error('Revenue fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [dateRange, includeTrialRevenue]);

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/admin/login');
      return;
    }
    fetchRevenueData();
  }, [isAuthenticated, user, navigate, fetchRevenueData]);

  const navigateToUnitDetails = (mietfachId: string) => {
    navigate(`/admin/mietfaecher/${mietfachId}`);
  };

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  if (loading) {
    return (
      <div className="revenue-overview-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Lade Umsatzdaten...</h2>
          <p>Bitte warte einen Moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-overview-error">
        <div className="error-container">
          <i className="fas fa-exclamation-triangle"></i>
          <h2>Fehler beim Laden der Daten</h2>
          <p>{error}</p>
          <button onClick={fetchRevenueData} className="retry-button">
            <i className="fas fa-redo"></i>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!revenueData) {
    return (
      <div className="revenue-overview-error">
        <div className="error-container">
          <i className="fas fa-database"></i>
          <h2>Keine Daten verfügbar</h2>
          <p>Es konnten keine Umsatzdaten für den ausgewählten Zeitraum gefunden werden.</p>
        </div>
      </div>
    );
  }

  console.log('🔍 Frontend: About to render widgets with revenueData:', revenueData);

  return (
    <div className="revenue-overview-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Mieteinnahmen Übersicht</h1>
          <p>Detaillierte Analyse der Mieteinnahmen und Auslastung</p>
        </div>
        <div className="header-actions">
          <div className="projection-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showProjections}
                onChange={(e) => setShowProjections(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Zukunftsprojektionen anzeigen</span>
            </label>
          </div>
          <div className="trial-revenue-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={includeTrialRevenue}
                onChange={(e) => setIncludeTrialRevenue(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Probemonat-Umsätze einschließen</span>
            </label>
          </div>
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={handleDateRangeChange}
            allowFuture={showProjections}
          />
          <ExportButton dateRange={dateRange} />
        </div>
      </div>

      <div className="revenue-summary-grid">
        <MonthlyRevenueWidget
          title="Gesamteinnahmen"
          value={revenueData.totalRevenue || 0}
          trend={revenueData.revenueTrend}
          icon="euro-sign"
        />
        <MonthlyRevenueWidget
          title="Ø Monatlich"
          value={revenueData.monthlyAverage || 0}
          subtitle="Durchschnitt"
          icon="chart-line"
        />
        <MonthlyRevenueWidget
          title="Aktive Verträge"
          value={revenueData.totalActiveContracts || 0}
          subtitle={`${revenueData.totalTrialContracts || 0} im Probemonat`}
          icon="file-contract"
        />
        <MonthlyRevenueWidget
          title="Auslastung"
          value={`${(revenueData.occupancyRate || 0).toFixed(1)}%`}
          trend={revenueData.occupancyTrend}
          icon="chart-pie"
        />
      </div>

      <div className="revenue-charts-section">
        <div className="section-header">
          <h2>Umsatzentwicklung</h2>
          <p>Monatsweise Übersicht der Einnahmen und Verträge</p>
        </div>
        <RevenueChart 
          key={`${dateRange.startDate.toISOString()}-${dateRange.endDate.toISOString()}-${showProjections}-${includeTrialRevenue}`}
          data={revenueData.revenueByMonth || []} 
          showProjections={showProjections}
          includeTrialRevenue={includeTrialRevenue}
        />
      </div>

      <div className="revenue-details-section">
        <div className="section-header">
          <h2>Detaillierte Aufschlüsselung</h2>
          <p>Umsätze nach Mietfächern für den ausgewählten Zeitraum</p>
        </div>
        <RevenueByUnitTable 
          dateRange={dateRange}
          onUnitClick={navigateToUnitDetails}
        />
      </div>
    </div>
  );
}