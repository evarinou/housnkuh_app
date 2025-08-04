/**
 * @file React 18 application entry point and bootstrap
 * @description This file initializes the React application using React 18's createRoot API.
 * Sets up the DOM rendering with StrictMode for development checks and integrates 
 * performance monitoring through Web Vitals. Also loads custom fonts and global styles.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './styles/fonts.css';

/**
 * Create React 18 root instance for the application
 * @description Uses the new createRoot API introduced in React 18 for concurrent features.
 * Targets the 'root' element in the HTML document as the mounting point.
 * 
 * @throws {Error} If the 'root' element is not found in the DOM
 */
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

/**
 * Render the application with React StrictMode enabled
 * @description StrictMode provides additional development-time checks:
 * - Detects components with unsafe lifecycles
 * - Warns about legacy string ref API usage
 * - Warns about deprecated findDOMNode usage
 * - Detects unexpected side effects during rendering
 * - Helps identify components that will break with future React versions
 * 
 * @complexity O(1) - Single render operation
 */
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Initialize performance monitoring with Web Vitals
 * @description Collects Core Web Vitals metrics for performance analysis:
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay)
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - TTFB (Time to First Byte)
 * 
 * Can be configured to send metrics to analytics endpoints by passing a callback function.
 * Currently running with default behavior (no callback).
 * 
 * @see {@link https://bit.ly/CRA-vitals} For more information on Web Vitals integration
 */
reportWebVitals();
