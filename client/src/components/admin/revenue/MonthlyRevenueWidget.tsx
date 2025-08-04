import React from 'react';
import './MonthlyRevenueWidget.css';

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

export default function MonthlyRevenueWidget({
  title,
  value,
  trend,
  subtitle,
  icon,
  onClick
}: RevenueWidgetProps) {
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