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
      const fileInput = screen.getByLabelText(/profilbild/i) as HTMLInputElement;
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

      const fileInput = screen.getByLabelText(/profilbild/i) as HTMLInputElement;
      const file = new File(['test'], 'test.png', { type: 'image/png' });

      // Mock FileReader to verify the handler processes the file each time
      const mockReadAsDataURL = jest.fn();
      const mockReader = {
        readAsDataURL: mockReadAsDataURL,
        onloadend: null as any,
        onerror: null as any,
        result: 'data:image/png;base64,test'
      };
      const readerSpy = jest.spyOn(window, 'FileReader').mockImplementation(() => mockReader as any);

      // First selection
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });

      expect(mockReadAsDataURL).toHaveBeenCalledTimes(1);
      expect(mockReadAsDataURL).toHaveBeenCalledWith(file);
      expect(fileInput.value).toBe('');

      // Second selection of the same file
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });

      // Verify handler was called again
      expect(mockReadAsDataURL).toHaveBeenCalledTimes(2);

      readerSpy.mockRestore();
    });

    it('should reset banner file input value after selecting a banner image', async () => {
      renderVendorProfilePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Banner-Bild/i)).toBeInTheDocument();
      });

      // Find all file inputs and get the second one (banner)
      const fileInputs = screen.getAllByLabelText(/profilbild|banner/i);
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

      const fileInputs = screen.getAllByLabelText(/profilbild|banner/i);
      const bannerInput = fileInputs[1] as HTMLInputElement;
      const file = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' });

      // Mock FileReader to verify the handler processes the file each time
      const mockReadAsDataURL = jest.fn();
      const mockReader = {
        readAsDataURL: mockReadAsDataURL,
        onloadend: null as any,
        onerror: null as any,
        result: 'data:image/jpeg;base64,test'
      };
      const readerSpy = jest.spyOn(window, 'FileReader').mockImplementation(() => mockReader as any);

      // First selection
      fireEvent.change(bannerInput, {
        target: { files: [file] }
      });

      expect(mockReadAsDataURL).toHaveBeenCalledTimes(1);
      expect(mockReadAsDataURL).toHaveBeenCalledWith(file);
      expect(bannerInput.value).toBe('');

      // Second selection of the same file
      fireEvent.change(bannerInput, {
        target: { files: [file] }
      });

      // Verify handler was called again
      expect(mockReadAsDataURL).toHaveBeenCalledTimes(2);

      readerSpy.mockRestore();
    });

    it('should handle case when no file is selected', async () => {
      renderVendorProfilePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Profilbild/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/profilbild/i) as HTMLInputElement;

      // Mock FileReader to verify no file processing happens
      const mockReadAsDataURL = jest.fn();
      const readerSpy = jest.spyOn(window, 'FileReader').mockImplementation(
        () => ({ readAsDataURL: mockReadAsDataURL } as any)
      );

      // Simulate change event with no files
      fireEvent.change(fileInput, {
        target: { files: [] }
      });

      expect(mockReadAsDataURL).not.toHaveBeenCalled();
      expect(fileInput.value).toBe('');

      readerSpy.mockRestore();
    });

    it('should create preview URL when file is selected', async () => {
      renderVendorProfilePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Profilbild/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/profilbild/i) as HTMLInputElement;
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      // Mock FileReader
      const mockReadAsDataURL = jest.fn();
      const mockReader = {
        readAsDataURL: mockReadAsDataURL,
        onloadend: null as any,
        result: 'data:image/png;base64,test'
      };
      
      jest.spyOn(window, 'FileReader').mockImplementation(() => mockReader as any);

      // Simulate file selection
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });

      // Simulate FileReader onloadend
      if (mockReader.onloadend) {
        mockReader.onloadend({} as any);
      }

      expect(mockReadAsDataURL).toHaveBeenCalledWith(file);
    });
  });
});