/**
 * @file Main application component - Clean router-only structure
 * @description Root component that provides routing for the housnkuh marketplace.
 * Authentication providers are now mounted at the route level for better performance.
 */

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppContent from './components/AppContent';

/**
 * Root application component with clean router-only structure
 * @description Sets up the foundational routing structure for the housnkuh marketplace.
 * Authentication providers are now mounted at the route level instead of globally,
 * providing better performance and cleaner separation of concerns.
 * 
 * @returns {JSX.Element} Clean router structure with route-based providers
 * @complexity O(1) - Simple component composition
 */
function App(): JSX.Element {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;