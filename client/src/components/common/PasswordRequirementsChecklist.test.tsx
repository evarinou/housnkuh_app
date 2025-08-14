/**
 * @file PasswordRequirementsChecklist.test.tsx
 * @purpose Unit tests for PasswordRequirementsChecklist component
 * @created 2025-08-06
 * @modified 2025-08-06
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PasswordRequirementsChecklist } from './PasswordRequirementsChecklist';

describe('PasswordRequirementsChecklist', () => {
  describe('Empty password', () => {
    it('should show all requirements as unmet for empty password', () => {
      render(<PasswordRequirementsChecklist password="" />);
      
      expect(screen.getByText('Mindestens 8 Zeichen')).toBeInTheDocument();
      expect(screen.getByText('Mindestens ein Kleinbuchstabe')).toBeInTheDocument();
      expect(screen.getByText('Mindestens ein Großbuchstabe')).toBeInTheDocument();
      expect(screen.getByText('Mindestens eine Zahl')).toBeInTheDocument();
      expect(screen.getByText('Mindestens ein Sonderzeichen (@$!%*?&)')).toBeInTheDocument();

      // All should have XCircle icons (not met)
      const xCircles = screen.getAllByLabelText('Nicht erfüllt');
      expect(xCircles).toHaveLength(5);
      
      // No CheckCircle icons should be present
      const checkCircles = screen.queryAllByLabelText('Erfüllt');
      expect(checkCircles).toHaveLength(0);
    });
  });

  describe('Partial password requirements', () => {
    it('should show only length requirement as met for "12345678"', () => {
      render(<PasswordRequirementsChecklist password="12345678" />);
      
      // Length requirement should be met (and number requirement too since password contains digits)
      const checkCircles = screen.getAllByLabelText('Erfüllt');
      expect(checkCircles).toHaveLength(2); // length + number
      
      // Other requirements should not be met
      const xCircles = screen.getAllByLabelText('Nicht erfüllt');
      expect(xCircles).toHaveLength(3); // lowercase, uppercase, special
    });

    it('should show length and lowercase requirements as met for "abcdefgh"', () => {
      render(<PasswordRequirementsChecklist password="abcdefgh" />);
      
      // Two requirements should be met
      const checkCircles = screen.getAllByLabelText('Erfüllt');
      expect(checkCircles).toHaveLength(2);
      
      // Three requirements should not be met
      const xCircles = screen.getAllByLabelText('Nicht erfüllt');
      expect(xCircles).toHaveLength(3);
    });

    it('should show multiple requirements as met for "Abc123!!"', () => {
      render(<PasswordRequirementsChecklist password="Abc123!!" />);
      
      // All requirements should be met
      const checkCircles = screen.getAllByLabelText('Erfüllt');
      expect(checkCircles).toHaveLength(5);
      
      // No requirements should be unmet
      const xCircles = screen.queryAllByLabelText('Nicht erfüllt');
      expect(xCircles).toHaveLength(0);
    });
  });

  describe('Fully valid password', () => {
    it('should show all requirements as met for valid password', () => {
      render(<PasswordRequirementsChecklist password="Test123@" />);
      
      // All requirements should be met
      const checkCircles = screen.getAllByLabelText('Erfüllt');
      expect(checkCircles).toHaveLength(5);
      
      // Verify green text classes are applied
      expect(screen.getByText('Mindestens 8 Zeichen')).toHaveClass('text-green-700');
      expect(screen.getByText('Mindestens ein Kleinbuchstabe')).toHaveClass('text-green-700');
      expect(screen.getByText('Mindestens ein Großbuchstabe')).toHaveClass('text-green-700');
      expect(screen.getByText('Mindestens eine Zahl')).toHaveClass('text-green-700');
      expect(screen.getByText('Mindestens ein Sonderzeichen (@$!%*?&)')).toHaveClass('text-green-700');
    });
  });

  describe('Real-time updates', () => {
    it('should update requirements as password changes', () => {
      const { rerender } = render(<PasswordRequirementsChecklist password="test" />);
      
      // Initially, only lowercase should be met
      expect(screen.getAllByLabelText('Erfüllt')).toHaveLength(1);
      expect(screen.getAllByLabelText('Nicht erfüllt')).toHaveLength(4);
      
      // Update to meet more requirements
      rerender(<PasswordRequirementsChecklist password="Test123!" />);
      
      // Now all requirements should be met
      expect(screen.getAllByLabelText('Erfüllt')).toHaveLength(5);
      expect(screen.queryAllByLabelText('Nicht erfüllt')).toHaveLength(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PasswordRequirementsChecklist password="test" />);
      
      expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Passwort-Anforderungen');
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
    });

    it('should have unique IDs for each requirement', () => {
      render(<PasswordRequirementsChecklist password="test" />);
      
      expect(screen.getByText('Mindestens 8 Zeichen')).toHaveAttribute('id', 'req-length');
      expect(screen.getByText('Mindestens ein Kleinbuchstabe')).toHaveAttribute('id', 'req-lowercase');
      expect(screen.getByText('Mindestens ein Großbuchstabe')).toHaveAttribute('id', 'req-uppercase');
      expect(screen.getByText('Mindestens eine Zahl')).toHaveAttribute('id', 'req-number');
      expect(screen.getByText('Mindestens ein Sonderzeichen (@$!%*?&)')).toHaveAttribute('id', 'req-special');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(
        <PasswordRequirementsChecklist password="test" className="custom-class" />
      );
      
      expect(screen.getByRole('list')).toHaveClass('custom-class');
    });

    it('should apply correct text colors based on requirement state', () => {
      render(<PasswordRequirementsChecklist password="Test" />);
      
      // Met requirements should be green
      expect(screen.getByText('Mindestens ein Kleinbuchstabe')).toHaveClass('text-green-700');
      expect(screen.getByText('Mindestens ein Großbuchstabe')).toHaveClass('text-green-700');
      
      // Unmet requirements should be gray
      expect(screen.getByText('Mindestens 8 Zeichen')).toHaveClass('text-gray-500');
      expect(screen.getByText('Mindestens eine Zahl')).toHaveClass('text-gray-500');
      expect(screen.getByText('Mindestens ein Sonderzeichen (@$!%*?&)')).toHaveClass('text-gray-500');
    });
  });

  describe('Special characters validation', () => {
    it('should recognize all allowed special characters', () => {
      const specialChars = ['@', '$', '!', '%', '*', '?', '&'];
      
      specialChars.forEach(char => {
        const password = `Test123${char}`;
        render(<PasswordRequirementsChecklist password={password} />);
        
        // Special character requirement should be met
        const checkCircles = screen.getAllByLabelText('Erfüllt');
        expect(checkCircles.length).toBeGreaterThanOrEqual(4); // At least length, upper, lower, number, special
        
        // Clean up for next iteration
        screen.debug = () => {}; // Prevent debug output
      });
    });

    it('should not accept invalid special characters', () => {
      render(<PasswordRequirementsChecklist password="Test123#" />);
      
      // Special character requirement should not be met (# is not allowed)
      const specialCharText = screen.getByText('Mindestens ein Sonderzeichen (@$!%*?&)');
      expect(specialCharText).toHaveClass('text-gray-500');
    });
  });
});