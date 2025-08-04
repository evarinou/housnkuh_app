/**
 * @file Jest testing environment setup and configuration
 * @description Configures the Jest testing environment with necessary polyfills, mocks, and
 * testing utilities. Sets up DOM testing capabilities through jest-dom and handles external
 * library mocking for Leaflet maps and browser APIs that aren't available in the test environment.
 */

/**
 * Import jest-dom custom matchers for enhanced DOM testing
 * @description Adds custom Jest matchers for asserting on DOM nodes, enabling more readable tests:
 * - toHaveTextContent(): Check if element contains specific text
 * - toBeVisible(): Check if element is visible to users
 * - toBeDisabled(): Check if form element is disabled
 * - toHaveClass(): Check if element has specific CSS classes
 * - And many more DOM-focused matchers
 * 
 * @see {@link https://github.com/testing-library/jest-dom} For complete matcher documentation
 */
import '@testing-library/jest-dom';

/**
 * Mock Leaflet CSS imports to prevent Jest from trying to process CSS files
 * @description Leaflet requires CSS for proper map rendering, but Jest cannot process CSS files
 * during testing. This mock prevents import errors and allows tests to run normally.
 */
jest.mock('leaflet/dist/leaflet.css', () => ({}));

/**
 * Mock Leaflet image assets to prevent asset loading errors in tests
 * @description Leaflet uses various image assets for map markers and controls. Since these
 * assets are not available in the test environment, we mock them with simple string values
 * to prevent module loading errors during testing.
 */
jest.mock('leaflet/dist/images/marker-icon-2x.png', () => 'marker-icon-2x.png');
jest.mock('leaflet/dist/images/marker-icon.png', () => 'marker-icon.png');
jest.mock('leaflet/dist/images/marker-shadow.png', () => 'marker-shadow.png');

/**
 * Mock IntersectionObserver API for components using react-intersection-observer
 * @description IntersectionObserver is a browser API that's not available in the Jest test environment.
 * This mock provides a minimal implementation that prevents errors when testing components
 * that use intersection observation for features like lazy loading or scroll-triggered animations.
 * 
 * The mock implements all required methods but with no-op functionality suitable for testing.
 */
(global as any).IntersectionObserver = class IntersectionObserver {
  /** Root element for intersection observation (always null in mock) */
  root = null;
  
  /** Root margin for intersection calculation (empty string in mock) */
  rootMargin = '';
  
  /** Threshold values for intersection callbacks (empty array in mock) */
  thresholds = [];
  
  /**
   * Create a new IntersectionObserver instance
   * @description Mock constructor that accepts standard IntersectionObserver parameters
   * but doesn't perform any actual observation functionality.
   */
  constructor() {}
  
  /**
   * Begin observing a target element
   * @description Mock implementation that accepts an element but performs no observation.
   * @returns {null} Always returns null in the mock implementation
   */
  observe() {
    return null;
  }
  
  /**
   * Stop observing all target elements
   * @description Mock implementation that performs no cleanup since no actual observation occurs.
   * @returns {null} Always returns null in the mock implementation
   */
  disconnect() {
    return null;
  }
  
  /**
   * Stop observing a specific target element
   * @description Mock implementation that accepts an element but performs no cleanup.
   * @returns {null} Always returns null in the mock implementation
   */
  unobserve() {
    return null;
  }
  
  /**
   * Get all intersection records since last callback
   * @description Mock implementation that returns an empty array since no intersection
   * observation is actually performed.
   * @returns {Array} Always returns an empty array in the mock implementation
   */
  takeRecords() {
    return [];
  }
};
