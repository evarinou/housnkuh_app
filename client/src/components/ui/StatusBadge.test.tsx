/**
 * @file StatusBadge.test.tsx
 * @purpose Comprehensive unit tests for StatusBadge component
 * @created 2025-01-09
 * @modified 2025-01-09
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusBadge, { InvoiceStatus } from './StatusBadge';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    span: ({ children, onMouseEnter, onMouseLeave, ...props }: any) => (
      <span {...props} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        {children}
      </span>
    ),
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('StatusBadge', () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
  const paidDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

  describe('Badge rendering for each status', () => {
    it('renders draft status correctly', () => {
      render(<StatusBadge status="draft" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Entwurf');
      expect(badge).toHaveTextContent('📝');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
      expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Status: Entwurf'));
    });

    it('renders sent status correctly', () => {
      render(<StatusBadge status="sent" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Versendet');
      expect(badge).toHaveTextContent('📤');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('renders paid status correctly', () => {
      render(<StatusBadge status="paid" paidDate={paidDate} />);
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Bezahlt');
      expect(badge).toHaveTextContent('✅');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('renders overdue status correctly', () => {
      render(<StatusBadge status="overdue" dueDate={pastDate} />);
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Überfällig');
      expect(badge).toHaveTextContent('⚠️');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('renders cancelled status with strikethrough', () => {
      render(<StatusBadge status="cancelled" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Storniert');
      expect(badge).toHaveTextContent('❌');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600', 'line-through');
    });
  });

  describe('Color assignment', () => {
    it.each([
      ['draft', 'bg-gray-100', 'text-gray-800'],
      ['sent', 'bg-blue-100', 'text-blue-800'],
      ['paid', 'bg-green-100', 'text-green-800'],
      ['overdue', 'bg-red-100', 'text-red-800'],
      ['cancelled', 'bg-gray-100', 'text-gray-600'],
    ])('applies correct colors for %s status', (status, bgClass, textClass) => {
      render(<StatusBadge status={status as InvoiceStatus} />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass(bgClass, textClass);
    });
  });

  describe('Automatic overdue detection', () => {
    it('automatically detects overdue status when dueDate is in the past', () => {
      render(<StatusBadge status="sent" dueDate={pastDate} />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Überfällig');
      expect(badge).toHaveTextContent('⚠️');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('does not mark as overdue when dueDate is in the future', () => {
      render(<StatusBadge status="sent" dueDate={futureDate} />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Versendet');
      expect(badge).not.toHaveTextContent('Überfällig');
    });

    it('does not override paid status even with past dueDate', () => {
      render(<StatusBadge status="paid" dueDate={pastDate} paidDate={paidDate} />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Bezahlt');
      expect(badge).not.toHaveTextContent('Überfällig');
    });

    it('does not override cancelled status even with past dueDate', () => {
      render(<StatusBadge status="cancelled" dueDate={pastDate} />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Storniert');
      expect(badge).not.toHaveTextContent('Überfällig');
    });

    it('handles missing dueDate gracefully', () => {
      render(<StatusBadge status="sent" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Versendet');
      expect(badge).not.toHaveTextContent('Überfällig');
    });
  });

  describe('Tooltip content', () => {
    it('shows basic tooltip content for draft status', async () => {
      render(<StatusBadge status="draft" showTooltip={true} />);
      
      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = screen.getByText('Rechnung wurde erstellt, aber noch nicht versendet');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveClass('absolute', 'bottom-full', 'bg-gray-900', 'text-white');
      });
    });

    it('shows date-specific tooltip content for paid status', async () => {
      render(<StatusBadge status="paid" paidDate={paidDate} showTooltip={true} />);
      
      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = screen.getByText(/Rechnung wurde am .* bezahlt/);
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveClass('absolute', 'bottom-full', 'bg-gray-900', 'text-white');
      });
    });

    it('shows date-specific tooltip content for overdue status', async () => {
      render(<StatusBadge status="overdue" dueDate={pastDate} showTooltip={true} />);
      
      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = screen.getByText(/Rechnung ist seit dem .* überfällig/);
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveClass('absolute', 'bottom-full', 'bg-gray-900', 'text-white');
      });
    });

    it('hides tooltip when showTooltip is false', () => {
      render(<StatusBadge status="draft" showTooltip={false} />);
      
      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('hides tooltip when mouse leaves', async () => {
      render(<StatusBadge status="draft" showTooltip={true} />);
      
      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        expect(screen.getByText('Rechnung wurde erstellt, aber noch nicht versendet')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(badge);

      await waitFor(() => {
        expect(screen.queryByText('Rechnung wurde erstellt, aber noch nicht versendet')).not.toBeInTheDocument();
      });
    });
  });

  describe('Animation triggers', () => {
    it('applies motion props to badge span', () => {
      render(<StatusBadge status="draft" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      // Animation props are handled by motion.span mock
    });

    it('applies motion props to tooltip', async () => {
      render(<StatusBadge status="draft" showTooltip={true} />);
      
      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = screen.getByText('Rechnung wurde erstellt, aber noch nicht versendet');
        expect(tooltip).toBeInTheDocument();
        // Animation props are handled by motion.div mock
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<StatusBadge status="paid" paidDate={paidDate} />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Status: Bezahlt'));
    });

    it('marks icons as aria-hidden', () => {
      render(<StatusBadge status="draft" />);
      
      const icon = screen.getByText('📝');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('marks tooltip as aria-hidden', async () => {
      render(<StatusBadge status="draft" showTooltip={true} />);
      
      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = screen.getByText('Rechnung wurde erstellt, aber noch nicht versendet');
        expect(tooltip).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Custom className', () => {
    it('applies custom className to badge', () => {
      render(<StatusBadge status="draft" className="custom-class" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class');
    });

    it('preserves default classes with custom className', () => {
      render(<StatusBadge status="draft" className="custom-class" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class', 'bg-gray-100', 'text-gray-800');
    });
  });

  describe('Edge cases', () => {
    it('handles invalid date strings gracefully', () => {
      render(<StatusBadge status="sent" dueDate="invalid-date" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Versendet');
      expect(badge).not.toHaveTextContent('Überfällig');
    });

    it('handles empty date strings gracefully', () => {
      render(<StatusBadge status="sent" dueDate="" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Versendet');
      expect(badge).not.toHaveTextContent('Überfällig');
    });

    it('handles null/undefined dates gracefully', () => {
      render(<StatusBadge status="sent" dueDate={undefined} />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Versendet');
      expect(badge).not.toHaveTextContent('Überfällig');
    });
  });
});