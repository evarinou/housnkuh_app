/**
 * @file MonthlyRevenueWidget.tsx
 * @purpose Revenue display widget with trend indicators and German currency formatting
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React from 'react';
import './MonthlyRevenueWidget.css';

/**
 * Props for the MonthlyRevenueWidget component
 * @interface RevenueWidgetProps
 */
interface RevenueWidgetProps {
  title: string;
  value: number | string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  subtitle?: string;
  icon: string;
  onClick?: () => void;
}

/**
 * Revenue display widget component with trend indicators and currency formatting
 * 
 * Features:
 * - German currency formatting (EUR) using Intl.NumberFormat
 * - Trend indicators with directional arrows and percentages
 * - FontAwesome icon integration
 * - Optional click handling for navigation
 * - Responsive design with CSS styling
 * - Flexible value display (number or string)
 * - Optional subtitle display
 * - Debug logging for value formatting
 * 
 * @param {RevenueWidgetProps} props - Component props
 * @param {string} props.title - Widget title/label
 * @param {number|string} props.value - Revenue value to display
 * @param {Object} [props.trend] - Optional trend information
 * @param {('up'|'down'|'neutral')} props.trend.direction - Trend direction
 * @param {number} props.trend.percentage - Trend percentage change
 * @param {string} [props.subtitle] - Optional subtitle text
 * @param {string} props.icon - FontAwesome icon name (without fa- prefix)
 * @param {() => void} [props.onClick] - Optional click handler
 * @returns {JSX.Element} Revenue widget with formatted display and trends
 * 
 * @complexity O(1) - Simple formatting and rendering
 */
export default function MonthlyRevenueWidget({
  title,
  value,
  trend,
  subtitle,
  icon,
  onClick
}: RevenueWidgetProps) {
  /**
   * Formats revenue values for German locale currency display
   * @param {number|string} val - Value to format
   * @returns {string} Formatted currency string or original value
   */
  const formatValue = (val: number | string) => {
    console.log('🔍 Frontend Widget: Formatting value:', { title, val, type: typeof val });
    if (typeof val === 'number') {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(val);
    }
    return val;
  };

  return (
    <div 
      className={`revenue-widget ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="widget-header">
        <div className="widget-icon">
          <i className={`fas fa-${icon}`}></i>
        </div>
        <h3>{title}</h3>
      </div>
      
      <div className="widget-value">
        <span className="value">{formatValue(value)}</span>
        {trend && (
          <span className={`trend trend-${trend.direction}`}>
            <i className={`fas fa-arrow-${trend.direction === 'up' ? 'up' : trend.direction === 'down' ? 'down' : 'right'}`}></i>
            {trend.percentage.toFixed(1)}%
          </span>
        )}
      </div>
      
      {subtitle && (
        <div className="widget-subtitle">{subtitle}</div>
      )}
    </div>
  );
}