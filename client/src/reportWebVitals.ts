/**
 * @file Web Vitals performance monitoring integration
 * @description Provides Core Web Vitals metrics collection using the web-vitals library.
 * Implements lazy loading of the metrics collection to avoid impacting initial bundle size.
 * Supports custom performance entry handlers for analytics integration.
 */

import { ReportHandler } from 'web-vitals';

/**
 * Initialize Web Vitals performance monitoring with optional custom handler
 * @description Collects Core Web Vitals metrics and optionally reports them to a custom handler.
 * Uses dynamic import to lazy-load the web-vitals library, reducing initial bundle size.
 * 
 * Core Web Vitals collected:
 * - CLS (Cumulative Layout Shift): Measures visual stability
 * - FID (First Input Delay): Measures interactivity
 * - FCP (First Contentful Paint): Measures perceived loading speed
 * - LCP (Largest Contentful Paint): Measures loading performance
 * - TTFB (Time to First Byte): Measures server response time
 * 
 * @param {ReportHandler} [onPerfEntry] - Optional callback function to handle performance entries
 * @returns {void}
 * 
 * @example
 * // Basic usage (no custom handler)
 * reportWebVitals();
 * 
 * @example
 * // With custom analytics handler
 * reportWebVitals((metric) => {
 *   console.log(metric);
 *   // Send to analytics service
 *   analytics.track('web-vital', metric);
 * });
 * 
 * @complexity O(1) - Simple conditional execution with lazy loading
 */
const reportWebVitals = (onPerfEntry?: ReportHandler): void => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    /**
     * Lazy load web-vitals library and initialize metric collection
     * @description Dynamic import ensures web-vitals is only loaded when needed,
     * preventing unnecessary bundle bloat. Each metric is collected independently.
     */
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);    // Cumulative Layout Shift
      getFID(onPerfEntry);    // First Input Delay
      getFCP(onPerfEntry);    // First Contentful Paint
      getLCP(onPerfEntry);    // Largest Contentful Paint
      getTTFB(onPerfEntry);   // Time to First Byte
    });
  }
};

export default reportWebVitals;
