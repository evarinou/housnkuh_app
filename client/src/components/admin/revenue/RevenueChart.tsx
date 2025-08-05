/**
 * @file RevenueChart.tsx
 * @purpose Advanced revenue visualization component with Recharts integration, projections, and dual-axis charts
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './RevenueChart.css';

/**
 * Revenue data structure for chart visualization
 * @interface RevenueData
 */
interface RevenueData {
  month: string;
  revenue: number;
  contracts: number;
  trialContracts: number;
  isProjection?: boolean;
}

/**
 * Props for the RevenueChart component
 * @interface RevenueChartProps
 */
interface RevenueChartProps {
  data: RevenueData[];
  showProjections?: boolean;
  includeTrialRevenue?: boolean;
}

/**
 * Advanced revenue visualization component using Recharts with projections and analytics
 * 
 * Features:
 * - Dual-axis charts (revenue + contracts) with independent scaling
 * - Line and bar chart toggle functionality
 * - Historical data vs projection visualization with different styling
 * - German locale date and currency formatting
 * - Trial contract tracking with conditional display
 * - Custom tooltip with projection indicators
 * - Responsive design with ResponsiveContainer
 * - Empty state handling for no data scenarios
 * - FontAwesome icon integration for controls
 * - Dashed lines for projections and trial data
 * - Color-coded data series with legend
 * 
 * @param {RevenueChartProps} props - Component props
 * @param {RevenueData[]} props.data - Array of revenue data points with dates
 * @param {boolean} [props.showProjections=false] - Whether to display projection data
 * @param {boolean} [props.includeTrialRevenue=false] - Whether to include trial revenue data
 * @returns {JSX.Element} Interactive revenue chart with dual-axis visualization
 * 
 * @complexity O(n) - Linear data processing and chart rendering
 */
export default function RevenueChart({ data, showProjections = false, includeTrialRevenue = false }: RevenueChartProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const showTrialData = includeTrialRevenue;

  // Data now includes both historical and projection data with isProjection flag
  const formattedData = data.map(item => ({
    month: new Date(item.month).toLocaleDateString('de-DE', { 
      month: 'short',
      year: 'numeric'
    }),
    revenue: item.isProjection ? null : item.revenue,
    contracts: item.isProjection ? null : item.contracts,
    trialContracts: item.isProjection ? null : item.trialContracts,
    isProjection: item.isProjection || false,
    projectedRevenue: item.isProjection ? item.revenue : null,
    projectedContracts: item.isProjection ? item.contracts : null,
    projectedTrialContracts: item.isProjection ? item.trialContracts : null
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isProjectionData = payload.some((entry: any) => entry.payload?.isProjection);
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">
            {label}
            {isProjectionData && <span className="projection-indicator"> (Projektion)</span>}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Einnahmen') ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="revenue-chart-container">
      <div className="chart-controls">
        <div className="chart-type-toggle">
          <button
            className={chartType === 'line' ? 'active' : ''}
            onClick={() => setChartType('line')}
          >
            <i className="fas fa-chart-line"></i> Linie
          </button>
          <button
            className={chartType === 'bar' ? 'active' : ''}
            onClick={() => setChartType('bar')}
          >
            <i className="fas fa-chart-bar"></i> Balken
          </button>
        </div>
        
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'line' ? (
            <LineChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                yAxisId="revenue" 
                orientation="left" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickFormatter={formatCurrency}
              />
              <YAxis 
                yAxisId="contracts" 
                orientation="right" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                name="Einnahmen"
                strokeWidth={3}
                connectNulls={false}
              />
              
              {showProjections && (
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="projectedRevenue"
                  stroke="#3b82f6"
                  name="Einnahmen (Projektion)"
                  strokeWidth={2}
                  strokeDasharray="8,4"
                  connectNulls={false}
                />
              )}
              
              <Line
                yAxisId="contracts"
                type="monotone"
                dataKey="contracts"
                stroke="#8b5cf6"
                name="Aktive Verträge"
                strokeWidth={2}
                connectNulls={false}
              />
              
              {showProjections && (
                <Line
                  yAxisId="contracts"
                  type="monotone"
                  dataKey="projectedContracts"
                  stroke="#8b5cf6"
                  name="Aktive Verträge (Projektion)"
                  strokeWidth={2}
                  strokeDasharray="8,4"
                  connectNulls={false}
                />
              )}
              
              {showTrialData && (
                <Line
                  yAxisId="contracts"
                  type="monotone"
                  dataKey="trialContracts"
                  stroke="#10b981"
                  name="Probemonat-Verträge"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  connectNulls={false}
                />
              )}
              
              {showTrialData && showProjections && (
                <Line
                  yAxisId="contracts"
                  type="monotone"
                  dataKey="projectedTrialContracts"
                  stroke="#10b981"
                  name="Probemonat-Verträge (Projektion)"
                  strokeWidth={2}
                  strokeDasharray="3,3"
                  connectNulls={false}
                />
              )}
            </LineChart>
          ) : (
            <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                yAxisId="revenue" 
                orientation="left" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickFormatter={formatCurrency}
              />
              <YAxis 
                yAxisId="contracts" 
                orientation="right" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                fill="#3b82f6"
                name="Einnahmen"
              />
              
              {showProjections && (
                <Bar
                  yAxisId="revenue"
                  dataKey="projectedRevenue"
                  fill="#93c5fd"
                  name="Einnahmen (Projektion)"
                  fillOpacity={0.7}
                />
              )}
              
              <Bar
                yAxisId="contracts"
                dataKey="contracts"
                fill="#8b5cf6"
                name="Aktive Verträge"
              />
              
              {showProjections && (
                <Bar
                  yAxisId="contracts"
                  dataKey="projectedContracts"
                  fill="#c4b5fd"
                  name="Aktive Verträge (Projektion)"
                  fillOpacity={0.7}
                />
              )}
              
              {showTrialData && (
                <Bar
                  yAxisId="contracts"
                  dataKey="trialContracts"
                  fill="#10b981"
                  name="Probemonat-Verträge"
                />
              )}
              
              {showTrialData && showProjections && (
                <Bar
                  yAxisId="contracts"
                  dataKey="projectedTrialContracts"
                  fill="#86efac"
                  name="Probemonat-Verträge (Projektion)"
                  fillOpacity={0.7}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {formattedData.length === 0 && (
        <div className="chart-empty-state">
          <i className="fas fa-chart-line"></i>
          <h3>Keine Daten verfügbar</h3>
          <p>Für den ausgewählten Zeitraum sind keine Umsatzdaten vorhanden.</p>
        </div>
      )}
    </div>
  );
}