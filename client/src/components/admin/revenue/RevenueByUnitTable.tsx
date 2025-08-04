import React, { useState, useEffect, useCallback } from 'react';
import './RevenueByUnitTable.css';

interface UnitRevenue {
  mietfachId: string;
  mietfachNummer: string;
  kategorie: string;
  revenue: number;
  contracts: number;
  isTrialActive: boolean;
  status: 'occupied' | 'available';
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface RevenueByUnitTableProps {
  dateRange: DateRange;
  onUnitClick: (mietfachId: string) => void;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

const PaginationComponent: React.FC<Pagination> = ({ currentPage, totalPages, totalCount, onPageChange }) => {
  const getVisiblePages = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <div className="pagination-info">
        Gesamt: {totalCount} Einträge
      </div>
      <div className="pagination-controls">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="pagination-button"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        
        {getVisiblePages().map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`pagination-button ${currentPage === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="pagination-button"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
};

export default function RevenueByUnitTable({ dateRange, onUnitClick }: RevenueByUnitTableProps) {
  const [data, setData] = useState<UnitRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof UnitRevenue>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  const fetchUnitRevenue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await fetch(
        `${apiUrl}/admin/revenue/by-unit?startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}&page=${currentPage}&limit=${itemsPerPage}&sort=${sortField}&direction=${sortDirection}&filter=${encodeURIComponent(filter)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Umsatzdaten');
      }

      const result = await response.json();
      setData(result.data.units || []);
      setTotalCount(result.data.totalCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, currentPage, sortField, sortDirection, filter]);

  useEffect(() => {
    fetchUnitRevenue();
  }, [fetchUnitRevenue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, filter]);

  const handleSort = (field: keyof UnitRevenue) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getSortIcon = (field: keyof UnitRevenue) => {
    if (sortField !== field) return 'fa-sort';
    return sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  };

  const totalRevenue = data.reduce((sum, unit) => sum + unit.revenue, 0);
  const totalContracts = data.reduce((sum, unit) => sum + unit.contracts, 0);

  if (loading) {
    return (
      <div className="revenue-table-loading">
        <div className="loading-spinner"></div>
        <p>Lade Umsatzdaten...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-table-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error}</p>
        <button onClick={fetchUnitRevenue} className="retry-button">
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="revenue-by-unit-table">
      <div className="table-controls">
        <div className="search-container">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Suche nach Mietfach oder Kategorie..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="table-search"
          />
        </div>
      </div>

      <div className="table-container">
        <table className="revenue-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('mietfachNummer')} className="sortable">
                Mietfach
                <i className={`fas ${getSortIcon('mietfachNummer')} sort-icon`}></i>
              </th>
              <th onClick={() => handleSort('kategorie')} className="sortable">
                Kategorie
                <i className={`fas ${getSortIcon('kategorie')} sort-icon`}></i>
              </th>
              <th onClick={() => handleSort('revenue')} className="sortable">
                Einnahmen
                <i className={`fas ${getSortIcon('revenue')} sort-icon`}></i>
              </th>
              <th onClick={() => handleSort('contracts')} className="sortable">
                Verträge
                <i className={`fas ${getSortIcon('contracts')} sort-icon`}></i>
              </th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  <i className="fas fa-inbox"></i>
                  <p>Keine Daten für den ausgewählten Zeitraum gefunden.</p>
                </td>
              </tr>
            ) : (
              data.map(unit => (
                <tr 
                  key={unit.mietfachId}
                  onClick={() => onUnitClick(unit.mietfachId)}
                  className="clickable-row"
                >
                  <td className="mietfach-cell">
                    <span className="mietfach-number">{unit.mietfachNummer}</span>
                  </td>
                  <td className="kategorie-cell">{unit.kategorie}</td>
                  <td className="revenue-cell">{formatCurrency(unit.revenue)}</td>
                  <td className="contracts-cell">
                    <span className="contract-count">{unit.contracts}</span>
                    {unit.isTrialActive && (
                      <span className="trial-badge">Probemonat</span>
                    )}
                  </td>
                  <td className="status-cell">
                    <span className={`status-badge status-${unit.status}`}>
                      {unit.status === 'occupied' ? 'Belegt' : 'Verfügbar'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="summary-row">
                <td colSpan={2}><strong>Gesamt ({data.length} Einträge)</strong></td>
                <td><strong>{formatCurrency(totalRevenue)}</strong></td>
                <td><strong>{totalContracts}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <PaginationComponent
        currentPage={currentPage}
        totalPages={Math.ceil(totalCount / itemsPerPage)}
        totalCount={totalCount}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}