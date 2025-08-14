/**
 * @file VendorProfilePage.test.tsx
 * @purpose Unit tests for VendorProfilePage component with focus on file input reset functionality
 * @created 2025-08-13
 * @modified 2025-08-13
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import VendorProfilePage from './VendorProfilePage';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock axios for tags loading
jest.mock('axios', () => ({
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: [],
        count: 0
      }
    })
  },
  get: jest.fn().mockResolvedValue({
    data: {
      success: true,
      data: [],
      count: 0
    }
  }),
  isAxiosError: jest.fn().mockReturnValue(false)
}));

// Mock fetch
global.fetch = jest.fn();

// Mock the VendorAuthContext
jest.mock('../../contexts/VendorAuthContext', () => ({
  useVendorAuth: () => ({
    vendor: {
      _id: 'vendor-123',
      companyName: 'Test Vendor',
      email: 'vendor@test.com',
      profileComplete: true,
      profileImage: null,
      bannerImage: null,
      description: '',
      location: { city: '', state: '', country: '' },
      businessDetails: {},
      tags: []
    },
    user: {
      id: 'vendor-123',
      email: 'vendor@test.com',
      name: 'Test Vendor'
    },
    token: 'test-token-123',
    login: jest.fn(),
    logout: jest.fn(),
    checkAuth: jest.fn(),
    isLoading: false,
    updateVendor: jest.fn()
  })
}));

const renderVendorProfilePage = () => {
  return render(
    <BrowserRouter>
      <VendorProfilePage />
    </BrowserRouter>
  );
};

describe('VendorProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          _id: 'vendor-123',
          companyName: 'Test Vendor',
          email: 'vendor@test.com',
          profileComplete: true
        }
      })
    });
  });

  describe('File Input Reset Functionality', () => {
    it('should reset file input value after selecting a profile image', async () => {
      renderVendorProfilePage();
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/Profilbild/i)).toBeInTheDocument();
      });

      // Find the file input for profile image
      const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Create a mock file
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      // Simulate file selection
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });

      // Check that the input value was reset
      expect(fileInput.value).toBe('');
    });

    it('should trigger onChange event when selecting the same profile image twice', async () => {
      renderVendorProfilePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Profilbild/i)).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      // Mock console.log to verify the handler is called
      const consoleSpy = jest.spyOn(console, 'log');
      
      // First selection
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('🚀 handleFileSelect triggered');
      expect(consoleSpy).toHaveBeenCalledWith('📁 Selected file:', 'test.png', 4, 'image/png');
      
      // Clear console spy calls
      consoleSpy.mockClear();
      
      // Second selection of the same file
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });
      
      // Verify handler was called again
      expect(consoleSpy).toHaveBeenCalledWith('🚀 handleFileSelect triggered');
      expect(consoleSpy).toHaveBeenCalledWith('📁 Selected file:', 'test.png', 4, 'image/png');
      
      consoleSpy.mockRestore();
    });

    it('should reset banner file input value after selecting a banner image', async () => {
      renderVendorProfilePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Banner-Bild/i)).toBeInTheDocument();
      });

      // Find all file inputs and get the second one (banner)
      const fileInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
      expect(fileInputs.length).toBeGreaterThan(1);
      const bannerInput = fileInputs[1] as HTMLInputElement;

      const file = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' });
      
      // Simulate file selection
      fireEvent.change(bannerInput, {
        target: { files: [file] }
      });

      // Check that the input value was reset
      expect(bannerInput.value).toBe('');
    });

    it('should trigger onChange event when selecting the same banner image twice', async () => {
      renderVendorProfilePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Banner-Bild/i)).toBeInTheDocument();
      });

      const fileInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
      const bannerInput = fileInputs[1] as HTMLInputElement;
      const file = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' });
      
      const consoleSpy = jest.spyOn(console, 'log');
      
      // First selection
      fireEvent.change(bannerInput, {
        target: { files: [file] }
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('🚀 handleBannerFileSelect triggered');
      expect(consoleSpy).toHaveBeenCalledWith('📁 Selected banner file:', 'banner.jpg', 6, 'image/jpeg');
      
      // Clear console spy calls
      consoleSpy.mockClear();
      
      // Second selection of the same file
      fireEvent.change(bannerInput, {
        target: { files: [file] }
      });
      
      // Verify handler was called again
      expect(consoleSpy).toHaveBeenCalledWith('🚀 handleBannerFileSelect triggered');
      expect(consoleSpy).toHaveBeenCalledWith('📁 Selected banner file:', 'banner.jpg', 6, 'image/jpeg');
      
      consoleSpy.mockRestore();
    });

    it('should handle case when no file is selected', async () => {
      renderVendorProfilePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Profilbild/i)).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
      const consoleSpy = jest.spyOn(console, 'log');
      
      // Simulate change event with no files
      fireEvent.change(fileInput, {
        target: { files: [] }
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ No file selected');
      expect(fileInput.value).toBe('');
      
      consoleSpy.mockRestore();
    });

    it('should create preview URL when file is selected', async () => {
      renderVendorProfilePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Profilbild/i)).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      // Mock FileReader
      const mockReadAsDataURL = jest.fn();
      const mockReader = {
        readAsDataURL: mockReadAsDataURL,
        onloadend: null as any,
        result: 'data:image/png;base64,test'
      };
      
      jest.spyOn(window, 'FileReader').mockImplementation(() => mockReader as any);
      
      const consoleSpy = jest.spyOn(console, 'log');
      
      // Simulate file selection
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });
      
      // Simulate FileReader onloadend
      if (mockReader.onloadend) {
        mockReader.onloadend({} as any);
      }
      
      expect(consoleSpy).toHaveBeenCalledWith('🖼️ Preview created for:', 'test.png');
      expect(mockReadAsDataURL).toHaveBeenCalledWith(file);
      
      consoleSpy.mockRestore();
    });
  });
});