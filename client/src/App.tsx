
// client/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navigation from './components/layout/Navigation';
import Hero from './components/layout/Hero';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import DirektvermarkterPage from './pages/DirektvermarkterPage';
import StandortPage from './pages/StandortPage';
import MietenPage from './pages/MietenPage';
import KontaktPage from './pages/KontaktPage';
import VendorsPage from './pages/VendorsPage';
import PricingPage from './pages/PricingPage';
import NewsletterConfirmPage from './pages/NewsletterConfirmPage';

// Admin-Komponenten importieren
import { AuthProvider } from './contexts/AuthContext';
import { VendorAuthProvider } from './contexts/VendorAuthContext';
import ProtectedRoute from './components/admin/ProtectedRoute';
import LoginPage from './pages/admin/LoginPage';
import SetupPage from './pages/admin/SetupPage';
import DashboardPage from './pages/admin/DashboardPage';
import NewsletterPage from './pages/admin/NewsletterPage';
import UnauthorizedPage from './pages/admin/UnauthorizedPage';

// Komponente für das Layout mit Conditional Navigation
const AppContent: React.FC = () => {
  const location = useLocation();
  
  // Prüfen, ob wir uns im Admin-Bereich befinden
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation nur anzeigen, wenn wir NICHT im Admin-Bereich sind */}
      {!isAdminRoute && <Navigation />}
      
      <main className={`flex-grow ${!isAdminRoute ? 'pt-24' : ''}`}>
        <Routes>
          {/* Admin-Routen - ohne Haupt-Navigation */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/setup" element={<SetupPage />} />
          <Route path="/admin/unauthorized" element={<UnauthorizedPage />} />
          
          {/* Geschützte Admin-Routen */}
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route index element={<DashboardPage />} />
            <Route path="newsletter" element={<NewsletterPage />} />
            {/* Weitere Admin-Routen können hier hinzugefügt werden */}
          </Route>
          
          {/* Öffentliche Routen - mit Haupt-Navigation */}
          <Route path="/" element={
            <>
              <Hero />
              <HomePage />
            </>
          } />
          <Route path="/direktvermarkter" element={<DirektvermarkterPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/standort" element={<StandortPage />} />
          <Route path="/mieten" element={<MietenPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/kontakt" element={<KontaktPage />} />
          <Route path="/newsletter/confirm" element={<NewsletterConfirmPage />} />
        </Routes>
      </main>
      
      {/* Footer nur anzeigen, wenn wir NICHT im Admin-Bereich sind */}
      {!isAdminRoute && <Footer />}
    </div>
  );
};

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