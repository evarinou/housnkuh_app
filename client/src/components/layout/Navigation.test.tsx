/**
 * @file Navigation.test.tsx
 * @purpose Unit tests for Navigation component with direct context checking
 * @created 2025-08-12
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from './Navigation';
import { AuthStateContext } from '../../contexts/AuthContext';
import { VendorAuthStateContext } from '../../contexts/VendorAuthContext';

describe('Navigation Component', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('Without Auth Context (Public Routes)', () => {
    it('should show Login link when no auth context is available', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('With Admin Auth Context', () => {
    it('should show Dashboard link when admin is authenticated', () => {
      const mockAuthState = {
        isAuthenticated: true,
        user: { id: '1', username: 'admin', name: 'Admin User', isAdmin: true },
        token: 'test-token',
        isLoading: false
      };

      renderWithRouter(
        <AuthStateContext.Provider value={mockAuthState}>
          <Navigation />
        </AuthStateContext.Provider>
      );
      
      // Check for Dashboard link (there might be multiple Dashboard texts in nav)
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
    });

    it('should show Login link when admin context exists but not authenticated', () => {
      const mockAuthState = {
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false
      };

      renderWithRouter(
        <AuthStateContext.Provider value={mockAuthState}>
          <Navigation />
        </AuthStateContext.Provider>
      );
      
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('With Vendor Auth Context', () => {
    it('should show Dashboard link when vendor is authenticated', () => {
      const mockVendorState = {
        isAuthenticated: true,
        user: { 
          id: '2', 
          email: 'vendor@test.com', 
          name: 'Vendor User', 
          isVendor: true,
          registrationStatus: 'active' as const
        },
        token: 'vendor-token',
        isLoading: false,
        trialStatus: null,
        hasActiveBooking: false,
        hasPendingBooking: false,
        isVendorRegistered: true,
        vendorDetails: null,
        bookings: [],
        isBookingsLoading: false
      };

      renderWithRouter(
        <VendorAuthStateContext.Provider value={mockVendorState}>
          <Navigation />
        </VendorAuthStateContext.Provider>
      );
      
      // Check for Dashboard link (there might be multiple Dashboard texts in nav)
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
    });

    it('should show Login link when vendor context exists but not authenticated', () => {
      const mockVendorState = {
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        trialStatus: null,
        hasActiveBooking: false,
        hasPendingBooking: false,
        isVendorRegistered: false,
        vendorDetails: null,
        bookings: [],
        isBookingsLoading: false
      };

      renderWithRouter(
        <VendorAuthStateContext.Provider value={mockVendorState}>
          <Navigation />
        </VendorAuthStateContext.Provider>
      );
      
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('With Both Auth Contexts', () => {
    it('should show Dashboard link when admin is authenticated (admin takes precedence)', () => {
      const mockAuthState = {
        isAuthenticated: true,
        user: { id: '1', username: 'admin', name: 'Admin User', isAdmin: true },
        token: 'admin-token',
        isLoading: false
      };

      const mockVendorState = {
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        trialStatus: null,
        hasActiveBooking: false,
        hasPendingBooking: false,
        isVendorRegistered: false,
        vendorDetails: null,
        bookings: [],
        isBookingsLoading: false
      };

      renderWithRouter(
        <AuthStateContext.Provider value={mockAuthState}>
          <VendorAuthStateContext.Provider value={mockVendorState}>
            <Navigation />
          </VendorAuthStateContext.Provider>
        </AuthStateContext.Provider>
      );
      
      // Check for Dashboard link (there might be multiple Dashboard texts in nav)
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
    });

    it('should show Dashboard link when vendor is authenticated and admin is not', () => {
      const mockAuthState = {
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false
      };

      const mockVendorState = {
        isAuthenticated: true,
        user: { 
          id: '2', 
          email: 'vendor@test.com', 
          name: 'Vendor User', 
          isVendor: true,
          registrationStatus: 'active' as const
        },
        token: 'vendor-token',
        isLoading: false,
        trialStatus: null,
        hasActiveBooking: false,
        hasPendingBooking: false,
        isVendorRegistered: true,
        vendorDetails: null,
        bookings: [],
        isBookingsLoading: false
      };

      renderWithRouter(
        <AuthStateContext.Provider value={mockAuthState}>
          <VendorAuthStateContext.Provider value={mockVendorState}>
            <Navigation />
          </VendorAuthStateContext.Provider>
        </AuthStateContext.Provider>
      );
      
      // Check for Dashboard link (there might be multiple Dashboard texts in nav)
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
    });
  });

  describe('Vendor Profile Image Display', () => {
    it('should show profile image when vendor has profilBild', () => {
      const mockVendorState = {
        isAuthenticated: true,
        user: { 
          id: '2', 
          email: 'vendor@test.com', 
          name: 'Vendor User', 
          isVendor: true,
          registrationStatus: 'active' as const,
          profilBild: '/uploads/profile.jpg'
        },
        token: 'vendor-token',
        isLoading: false,
        trialStatus: null,
        hasActiveBooking: false,
        hasPendingBooking: false,
        isVendorRegistered: true,
        vendorDetails: null,
        bookings: [],
        isBookingsLoading: false
      };

      renderWithRouter(
        <VendorAuthStateContext.Provider value={mockVendorState}>
          <Navigation />
        </VendorAuthStateContext.Provider>
      );
      
      // Check for profile images (both desktop and mobile)
      const profileImages = screen.getAllByAltText('Vendor User Profil');
      expect(profileImages).toHaveLength(2); // One for desktop, one for mobile
      profileImages.forEach(image => {
        expect(image).toHaveAttribute('src', 'http://localhost:4000/uploads/profile.jpg');
      });
    });

    it('should show fallback user icon when vendor has no profilBild', () => {
      const mockVendorState = {
        isAuthenticated: true,
        user: { 
          id: '2', 
          email: 'vendor@test.com', 
          name: 'Vendor User', 
          isVendor: true,
          registrationStatus: 'active' as const,
          profilBild: undefined
        },
        token: 'vendor-token',
        isLoading: false,
        trialStatus: null,
        hasActiveBooking: false,
        hasPendingBooking: false,
        isVendorRegistered: true,
        vendorDetails: null,
        bookings: [],
        isBookingsLoading: false
      };

      renderWithRouter(
        <VendorAuthStateContext.Provider value={mockVendorState}>
          <Navigation />
        </VendorAuthStateContext.Provider>
      );
      
      // Should have user icon (no profile image alt text should be present)
      expect(screen.queryByAltText(/Profil/)).not.toBeInTheDocument();
      // Should still have Dashboard link
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Mobile Navigation Text', () => {
    it('should show "Direktvermarkter Login" text in mobile view when not authenticated', () => {
      renderWithRouter(<Navigation />);
      
      // Should show both "Login" (desktop) and "Direktvermarkter Login" (mobile)
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Direktvermarkter Login')).toBeInTheDocument();
    });
  });
});