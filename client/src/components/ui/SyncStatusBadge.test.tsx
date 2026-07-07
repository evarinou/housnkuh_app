/**
 * @file SyncStatusBadge.test.tsx
 * @purpose Unit tests for SyncStatusBadge component
 * @created 2025-10-17
 * @modified 2025-10-17
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SyncStatusBadge from './SyncStatusBadge';

describe('SyncStatusBadge', () => {
  describe('Status Display', () => {
    it('should render synced status correctly', () => {
      render(<SyncStatusBadge status="synced" />);

      expect(screen.getByText('Synchronisiert')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should render pending status correctly', () => {
      render(<SyncStatusBadge status="pending" />);

      expect(screen.getByText('Ausstehend')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should render error status correctly', () => {
      render(<SyncStatusBadge status="error" />);

      expect(screen.getByText('Fehler')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('should render never synced status correctly', () => {
      render(<SyncStatusBadge status="never" />);

      expect(screen.getByText('Nicht synchronisiert')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });

  describe('Tooltip Behavior', () => {
    it('should show tooltip on hover when enabled', async () => {
      const { container } = render(
        <SyncStatusBadge
          status="synced"
          lastSyncedAt="2025-10-17T10:00:00Z"
          showTooltip={true}
        />
      );

      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = container.querySelector('[role="tooltip"]');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent(/Letzte Synchronisation/i);
      });
    });

    it('should not render tooltip container when showTooltip is false', () => {
      const { container } = render(<SyncStatusBadge status="synced" showTooltip={false} />);

      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      const tooltip = container.querySelector('[role="tooltip"]');
      expect(tooltip).not.toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', async () => {
      const { container } = render(<SyncStatusBadge status="synced" />);

      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = container.querySelector('[role="tooltip"]');
        expect(tooltip).toBeInTheDocument();
      });

      fireEvent.mouseLeave(badge);

      await waitFor(() => {
        const tooltip = container.querySelector('[role="tooltip"]');
        expect(tooltip).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Message Display', () => {
    it('should display error message in tooltip when provided', async () => {
      const errorMessage = 'Network connection failed';
      const { container } = render(
        <SyncStatusBadge
          status="error"
          errorMessage={errorMessage}
        />
      );

      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = container.querySelector('[role="tooltip"]');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent(errorMessage);
      });
    });

    it('should show default error message when errorMessage not provided', async () => {
      const { container } = render(<SyncStatusBadge status="error" />);

      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = container.querySelector('[role="tooltip"]');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent(/Fehler bei der Synchronisation/i);
      });
    });
  });

  describe('Last Synced Date', () => {
    it('should format and display last synced date for synced status', async () => {
      const lastSyncedAt = '2025-10-17T10:30:00Z';
      const { container } = render(
        <SyncStatusBadge
          status="synced"
          lastSyncedAt={lastSyncedAt}
        />
      );

      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = container.querySelector('[role="tooltip"]');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent(/Letzte Synchronisation:/i);
      });
    });

    it('should show default message when lastSyncedAt not provided', async () => {
      const { container } = render(<SyncStatusBadge status="synced" />);

      const badge = screen.getByRole('status');
      fireEvent.mouseEnter(badge);

      await waitFor(() => {
        const tooltip = container.querySelector('[role="tooltip"]');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent(/Mit FlourIO synchronisiert/i);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SyncStatusBadge status="synced" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label');
      expect(badge.getAttribute('aria-label')).toContain('Status: Synchronisiert');
    });

    it('should mark icons as decorative', () => {
      render(<SyncStatusBadge status="synced" />);

      const badge = screen.getByRole('status');
      const svg = badge.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<SyncStatusBadge status="synced" className="custom-class" />);

      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });

    it('should preserve base classes when custom className is applied', () => {
      render(<SyncStatusBadge status="synced" className="custom-class" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-800');
    });
  });
});
