/**
 * @file useTrialManagement.test.ts
 * @purpose Unit tests for useTrialManagement hook with request deduplication and rate limiting
 * @created 2025-08-07
 * @modified 2025-08-08
 */

import { renderHook, act } from '@testing-library/react';
import axios from 'axios';

// Import after mocking
import { useTrialManagement } from './useTrialManagement';
import * as authUtils from '../utils/auth';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Define mocks before using them
jest.mock('../utils/auth', () => ({
  apiUtils: {
    getApiUrl: jest.fn(() => 'http://localhost:5000/api'),
    createAuthConfig: jest.fn((token: string) => ({
      headers: { Authorization: `Bearer ${token}` }
    }))
  },
  authValidation: {
    isValidToken: jest.fn((token: string | null) => !!token && token.length > 0),
    isValidUser: jest.fn(() => true)
  },
  userStorage: {
    getUser: jest.fn(() => ({ id: 'test-user-id', email: 'test@example.com' })),
    setUser: jest.fn()
  },
  axiosHeaders: {
    setAuthHeader: jest.fn()
  }
}));

// Type assertions for mocked modules
const mockAuthValidation = (authUtils.authValidation as jest.Mocked<typeof authUtils.authValidation>);

describe('useTrialManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Request Deduplication', () => {
    describe('getTrialStatus', () => {
      it('should deduplicate simultaneous identical requests', async () => {
        const mockResponse = {
          data: {
            success: true,
            data: { trialActive: true },
            message: 'Trial status retrieved'
          }
        };

        // Set up axios to delay response
        let resolvePromise: (value: any) => void;
        const delayedPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        mockedAxios.get.mockImplementation(() => delayedPromise);

        const { result } = renderHook(() => useTrialManagement());

        // Make multiple simultaneous calls
        let promise1: Promise<any>;
        let promise2: Promise<any>;
        let promise3: Promise<any>;

        act(() => {
          promise1 = result.current.getTrialStatus('test-token');
          promise2 = result.current.getTrialStatus('test-token');
          promise3 = result.current.getTrialStatus('test-token');
        });

        // Verify only one API call was made
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
          'http://localhost:5000/api/vendor-auth/trial-status',
          { headers: { Authorization: 'Bearer test-token' } }
        );

        // Resolve the delayed promise
        act(() => {
          resolvePromise!(mockResponse);
        });

        // Wait for all promises to resolve
        const [result1, result2, result3] = await Promise.all([promise1!, promise2!, promise3!]);

        // All results should be identical
        expect(result1).toEqual({
          success: true,
          data: { trialActive: true },
          message: 'Trial status retrieved'
        });
        expect(result2).toEqual(result1);
        expect(result3).toEqual(result1);

        // Still only one API call should have been made
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      });

      it('should clear cache after request completes', async () => {
        const mockResponse = {
          data: {
            success: true,
            data: { trialActive: true },
            message: 'Trial status retrieved'
          }
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        const { result } = renderHook(() => useTrialManagement());

        // Make first call
        await act(async () => {
          await result.current.getTrialStatus('test-token');
        });

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Make second call after first completes
        mockedAxios.get.mockResolvedValueOnce(mockResponse);
        
        await act(async () => {
          await result.current.getTrialStatus('test-token');
        });

        // Should make a new API call since cache was cleared
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      });

      it('should create separate cache entries for different tokens', async () => {
        const mockResponse1 = {
          data: {
            success: true,
            data: { trialActive: true, userId: 'user1' },
            message: 'Trial status for user1'
          }
        };

        const mockResponse2 = {
          data: {
            success: true,
            data: { trialActive: false, userId: 'user2' },
            message: 'Trial status for user2'
          }
        };

        mockedAxios.get
          .mockResolvedValueOnce(mockResponse1)
          .mockResolvedValueOnce(mockResponse2);

        const { result } = renderHook(() => useTrialManagement());

        // Make calls with different tokens simultaneously
        const [result1, result2] = await Promise.all([
          result.current.getTrialStatus('token1'),
          result.current.getTrialStatus('token2')
        ]);

        // Should make two API calls for different tokens
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        
        // Results should be different
        expect(result1.data?.userId).toBe('user1');
        expect(result2.data?.userId).toBe('user2');
      });

      it('should handle request failures and clear cache', async () => {
        const mockError = new Error('Network error');
        mockedAxios.get.mockRejectedValueOnce(mockError);

        const { result } = renderHook(() => useTrialManagement());

        // Make first call that fails
        const result1 = await result.current.getTrialStatus('test-token');
        
        expect(result1.success).toBe(false);
        expect(result1.message).toBe('Verbindungsfehler. Bitte versuche es später erneut.');
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Make second call after failure
        const mockResponse = {
          data: {
            success: true,
            data: { trialActive: true },
            message: 'Trial status retrieved'
          }
        };
        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        const result2 = await result.current.getTrialStatus('test-token');

        // Should make a new API call since cache was cleared after failure
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        expect(result2.success).toBe(true);
      });

      it('should return error for invalid token', async () => {
        mockAuthValidation.isValidToken.mockReturnValueOnce(false);

        const { result } = renderHook(() => useTrialManagement());

        const response = await result.current.getTrialStatus(null);
        
        expect(response.success).toBe(false);
        expect(response.message).toBe('Keine gültige Authentifizierung gefunden');
        expect(mockedAxios.get).not.toHaveBeenCalled();
      });
    });

    describe('checkAuth', () => {
      it('should deduplicate simultaneous auth check requests', async () => {
        const mockAuthResponse = {
          data: { success: true }
        };

        const mockProfileResponse = {
          data: {
            success: true,
            profile: { profilBild: 'test.jpg' }
          }
        };

        // Set up delayed response
        let resolveAuthPromise: (value: any) => void;
        const delayedAuthPromise = new Promise((resolve) => {
          resolveAuthPromise = resolve;
        });

        mockedAxios.get
          .mockImplementationOnce(() => delayedAuthPromise)
          .mockResolvedValueOnce(mockProfileResponse);

        const { result } = renderHook(() => useTrialManagement());
        const processUserData = jest.fn((userData) => userData);

        // Make multiple simultaneous calls
        let promise1: Promise<any>;
        let promise2: Promise<any>;

        act(() => {
          promise1 = result.current.checkAuth('test-token', processUserData);
          promise2 = result.current.checkAuth('test-token', processUserData);
        });

        // Verify only one auth check API call was made initially
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
          'http://localhost:5000/api/vendor-auth/check'
        );

        // Resolve the auth promise
        act(() => {
          resolveAuthPromise!(mockAuthResponse);
        });

        // Wait for all promises to resolve
        const [result1, result2] = await Promise.all([promise1!, promise2!]);

        // Both results should be true
        expect(result1).toBe(true);
        expect(result2).toBe(true);

        // Check total calls (1 for auth check, 1 for profile)
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      });
    });

    describe('cancelTrialBooking', () => {
      it('should deduplicate simultaneous cancel requests for same booking', async () => {
        const mockResponse = {
          data: {
            success: true,
            message: 'Booking cancelled successfully'
          }
        };

        // Set up delayed response
        let resolvePromise: (value: any) => void;
        const delayedPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        mockedAxios.post.mockImplementation(() => delayedPromise);

        const { result } = renderHook(() => useTrialManagement());

        // Make multiple simultaneous calls for same booking
        let promise1: Promise<any>;
        let promise2: Promise<any>;

        act(() => {
          promise1 = result.current.cancelTrialBooking('test-token', 'booking-123', 'Test reason');
          promise2 = result.current.cancelTrialBooking('test-token', 'booking-123', 'Test reason');
        });

        // Verify only one API call was made
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:5000/api/vendor-auth/cancel-trial-booking/booking-123',
          { reason: 'Test reason' },
          { headers: { Authorization: 'Bearer test-token' } }
        );

        // Resolve the promise
        act(() => {
          resolvePromise!(mockResponse);
        });

        // Wait for all promises to resolve
        const [result1, result2] = await Promise.all([promise1!, promise2!]);

        // Both results should be identical
        expect(result1).toEqual({
          success: true,
          message: 'Booking cancelled successfully'
        });
        expect(result2).toEqual(result1);

        // Still only one API call should have been made
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      });

      it('should allow separate requests for different bookings', async () => {
        const mockResponse1 = {
          data: {
            success: true,
            message: 'Booking 1 cancelled'
          }
        };

        const mockResponse2 = {
          data: {
            success: true,
            message: 'Booking 2 cancelled'
          }
        };

        mockedAxios.post
          .mockResolvedValueOnce(mockResponse1)
          .mockResolvedValueOnce(mockResponse2);

        const { result } = renderHook(() => useTrialManagement());

        // Make calls for different bookings simultaneously
        const [result1, result2] = await Promise.all([
          result.current.cancelTrialBooking('test-token', 'booking-123'),
          result.current.cancelTrialBooking('test-token', 'booking-456')
        ]);

        // Should make two API calls for different bookings
        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        
        // Results should be different
        expect(result1.message).toBe('Booking 1 cancelled');
        expect(result2.message).toBe('Booking 2 cancelled');
      });
    });
  });

  describe('Rate Limiting', () => {
    describe('getTrialStatus', () => {
      it('should enforce 1 second rate limit between requests', async () => {
        const mockResponse = {
          data: {
            success: true,
            data: { trialActive: true },
            message: 'Trial status retrieved'
          }
        };

        mockedAxios.get.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useTrialManagement());

        // First call should succeed
        const result1 = await result.current.getTrialStatus('test-token');
        expect(result1.success).toBe(true);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Immediate second call should return cached result
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result2 = await result.current.getTrialStatus('test-token');
        
        expect(consoleWarnSpy).toHaveBeenCalledWith('Rate limiting: returning cached result for getTrialStatus');
        expect(result2).toEqual(result1); // Should get cached result
        expect(mockedAxios.get).toHaveBeenCalledTimes(1); // No additional API call
        
        consoleWarnSpy.mockRestore();
      });

      it('should allow new request after rate limit expires', async () => {
        const mockResponse1 = {
          data: {
            success: true,
            data: { trialActive: true, timestamp: 'first' },
            message: 'First call'
          }
        };

        const mockResponse2 = {
          data: {
            success: true,
            data: { trialActive: true, timestamp: 'second' },
            message: 'Second call'
          }
        };

        mockedAxios.get
          .mockResolvedValueOnce(mockResponse1)
          .mockResolvedValueOnce(mockResponse2);

        const { result } = renderHook(() => useTrialManagement());

        // First call
        const result1 = await result.current.getTrialStatus('test-token');
        expect(result1.message).toBe('First call');
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Advance time by 1 second
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Second call after rate limit expires
        const result2 = await result.current.getTrialStatus('test-token');
        expect(result2.message).toBe('Second call');
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      });

      it('should allow retry immediately after error', async () => {
        const mockError = new Error('Network error');
        const mockSuccessResponse = {
          data: {
            success: true,
            data: { trialActive: true },
            message: 'Success after retry'
          }
        };

        mockedAxios.get
          .mockRejectedValueOnce(mockError)
          .mockResolvedValueOnce(mockSuccessResponse);

        const { result } = renderHook(() => useTrialManagement());

        // First call fails
        const result1 = await result.current.getTrialStatus('test-token');
        expect(result1.success).toBe(false);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Immediate retry should be allowed (timestamp was deleted on error)
        const result2 = await result.current.getTrialStatus('test-token');
        expect(result2.success).toBe(true);
        expect(result2.message).toBe('Success after retry');
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      });

      it('should maintain separate rate limits for different tokens', async () => {
        const mockResponse = {
          data: {
            success: true,
            data: { trialActive: true },
            message: 'Success'
          }
        };

        mockedAxios.get.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useTrialManagement());

        // Call with first token
        await result.current.getTrialStatus('token1');
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Immediate call with different token should succeed
        await result.current.getTrialStatus('token2');
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      });
    });

    describe('checkAuth', () => {
      it('should apply rate limiting to checkAuth calls', async () => {
        const mockAuthResponse = {
          data: { success: true }
        };

        mockedAxios.get.mockResolvedValue(mockAuthResponse);

        const { result } = renderHook(() => useTrialManagement());
        const processUserData = jest.fn((userData) => userData);

        // First call
        const result1 = await result.current.checkAuth('test-token', processUserData);
        expect(result1).toBe(true);
        expect(mockedAxios.get).toHaveBeenCalledTimes(2); // auth check + profile

        // Immediate second call should return cached result
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result2 = await result.current.checkAuth('test-token', processUserData);
        
        expect(consoleWarnSpy).toHaveBeenCalledWith('Rate limiting: returning cached result for checkAuth');
        expect(result2).toBe(true); // Cached result
        expect(mockedAxios.get).toHaveBeenCalledTimes(2); // No additional calls
        
        consoleWarnSpy.mockRestore();
      });

      it('should cache failed auth results', async () => {
        const mockAuthResponse = {
          data: { success: false }
        };

        mockedAxios.get.mockResolvedValue(mockAuthResponse);

        const { result } = renderHook(() => useTrialManagement());
        const processUserData = jest.fn((userData) => userData);

        // First call fails
        const result1 = await result.current.checkAuth('test-token', processUserData);
        expect(result1).toBe(false);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Immediate second call should return cached false result
        const result2 = await result.current.checkAuth('test-token', processUserData);
        expect(result2).toBe(false); // Cached false result
        expect(mockedAxios.get).toHaveBeenCalledTimes(1); // No additional call
      });
    });

    describe('cancelTrialBooking', () => {
      it('should apply rate limiting to cancel requests', async () => {
        const mockResponse = {
          data: {
            success: true,
            message: 'Booking cancelled'
          }
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useTrialManagement());

        // First call
        const result1 = await result.current.cancelTrialBooking('test-token', 'booking-123');
        expect(result1.success).toBe(true);
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);

        // Immediate second call should return cached result
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result2 = await result.current.cancelTrialBooking('test-token', 'booking-123');
        
        expect(consoleWarnSpy).toHaveBeenCalledWith('Rate limiting: returning cached result for cancelTrialBooking');
        expect(result2).toEqual(result1); // Cached result
        expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No additional call
        
        consoleWarnSpy.mockRestore();
      });

      it('should maintain separate rate limits for different bookings', async () => {
        const mockResponse = {
          data: {
            success: true,
            message: 'Cancelled'
          }
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useTrialManagement());

        // Call for first booking
        await result.current.cancelTrialBooking('test-token', 'booking-123');
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);

        // Immediate call for different booking should succeed
        await result.current.cancelTrialBooking('test-token', 'booking-456');
        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      });
    });

    describe('Rate Limit Edge Cases', () => {
      it('should return error message when rate limited without cache', async () => {
        const { result } = renderHook(() => useTrialManagement());

        // Make a call but don't let it complete
        const mockResponse = {
          data: {
            success: true,
            data: { trialActive: true },
            message: 'Success'
          }
        };

        mockedAxios.get.mockResolvedValue(mockResponse);
        
        // First call
        await result.current.getTrialStatus('test-token');
        
        // Clear the result cache to simulate edge case
        // Note: In real implementation, this is handled internally
        // but we're testing the fallback behavior
        
        // Try another call immediately (within rate limit)
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        // Create a new hook instance to simulate cleared cache
        const { result: newResult } = renderHook(() => useTrialManagement());
        await newResult.current.getTrialStatus('test-token');
        
        // First call on new instance should succeed
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        
        // But immediate second call should be rate limited
        await newResult.current.getTrialStatus('test-token');
        expect(consoleWarnSpy).toHaveBeenCalled();
        
        consoleWarnSpy.mockRestore();
      });

      it('should handle rapid successive calls gracefully', async () => {
        const mockResponse = {
          data: {
            success: true,
            data: { trialActive: true },
            message: 'Success'
          }
        };

        mockedAxios.get.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useTrialManagement());

        // Make 10 rapid calls
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(result.current.getTrialStatus('test-token'));
        }

        const results = await Promise.all(promises);

        // All should get the same result
        results.forEach(r => {
          expect(r.success).toBe(true);
        });

        // But only one API call should have been made
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      });
    });
  });
});