// client/src/App.tsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { VendorAuthProvider } from './contexts/VendorAuthContext';
import AppContent from './components/AppContent';

function App() {
  return (
    <AuthProvider>
      <VendorAuthProvider>
        <Router>
          <AppContent />
        </Router>
      </VendorAuthProvider>
    </AuthProvider>
  );
}

export default App;