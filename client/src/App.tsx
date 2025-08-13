/**
 * @file Main application component - Global provider architecture
 * @description Root component that provides routing for the housnkuh marketplace.
 * Authentication providers are mounted globally to ensure context availability on all routes.
 */

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppContent from './components/AppContent';
import SharedProviderWrapper from './components/providers/SharedProviderWrapper';

/**
 * Root application component with global provider architecture
 * @description Sets up the foundational routing structure for the housnkuh marketplace.
 * Authentication providers are mounted globally to ensure all routes have access to auth contexts,
 * enabling consistent authentication state display across the entire application.
 * 
 * @returns {JSX.Element} Router wrapped with global authentication providers
 * @complexity O(1) - Simple component composition
 */
function App(): JSX.Element {
  return (
    <Router>
      <SharedProviderWrapper>
        <AppContent />
      </SharedProviderWrapper>
    </Router>
  );
}

export default App;