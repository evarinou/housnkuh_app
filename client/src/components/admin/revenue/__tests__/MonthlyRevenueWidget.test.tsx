/**
 * @file MonthlyRevenueWidget.test.tsx
 * @purpose Comprehensive test suite for MonthlyRevenueWidget component with currency formatting and trend indicators
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MonthlyRevenueWidget from '../MonthlyRevenueWidget';

/**
 * Test suite for MonthlyRevenueWidget component functionality
 * 
 * Tests cover:
 * - Basic rendering with title and currency formatting
 * - Trend indicator display with directional arrows
 * - Optional subtitle rendering
 * - String value handling (percentage display)
 * - Clickable state CSS class application
 * - German locale currency formatting validation
 * - Optional prop handling and edge cases
 */
describe('MonthlyRevenueWidget', () => {
  const mockProps = {
    title: 'Test Revenue',
    value: 1234.56,
    icon: 'euro-sign'
  };

  it('renders widget with correct title and formatted currency value', () => {
    render(<MonthlyRevenueWidget {...mockProps} />);
    
    expect(screen.getByText('Test Revenue')).toBeInTheDocument();
    expect(screen.getByText('1.234,56 €')).toBeInTheDocument();
  });

  it('renders trend indicator when trend prop is provided', () => {
    const propsWithTrend = {
      ...mockProps,
      trend: {
        direction: 'up' as const,
        percentage: 12.5
      }
    };

    render(<MonthlyRevenueWidget {...propsWithTrend} />);
    
    expect(screen.getByText('12.5%')).toBeInTheDocument();
    expect(document.querySelector('.trend-up')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    const propsWithSubtitle = {
      ...mockProps,
      subtitle: 'Test Subtitle'
    };

    render(<MonthlyRevenueWidget {...propsWithSubtitle} />);
    
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders string values without currency formatting', () => {
    const propsWithStringValue = {
      ...mockProps,
      value: '85.5%'
    };

    render(<MonthlyRevenueWidget {...propsWithStringValue} />);
    
    expect(screen.getByText('85.5%')).toBeInTheDocument();
  });

  it('applies clickable class when onClick is provided', () => {
    const mockOnClick = jest.fn();
    const propsWithOnClick = {
      ...mockProps,
      onClick: mockOnClick
    };

    const { container } = render(<MonthlyRevenueWidget {...propsWithOnClick} />);
    
    expect(container.firstChild).toHaveClass('clickable');
  });
});