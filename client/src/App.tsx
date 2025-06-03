// client/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Hero from './components/layout/Hero';
import PublicLayout from './components/layout/PublicLayout';
import HomePage from './pages/HomePage';
import DirektvermarkterPage from './pages/DirektvermarkterPage';
import StandortPage from './pages/StandortPage';
import MietenPage from './pages/MietenPage';
import KontaktPage from './pages/KontaktPage';
import PricingPage from './pages/PricingPage';
import NewsletterConfirmPage from './pages/NewsletterConfirmPage';
import VendorConfirmPage from './pages/VendorConfirmPage';
import VendorLoginPage from './pages/VendorLoginPage';
import VendorDashboardPage from './pages/VendorDashboardPage';
import VendorProfilePage from './pages/vendor/VendorProfilePage';
import VendorContractsPage from './pages/vendor/VendorContractsPage';
import DirektvermarkterUebersichtPage from './pages/DirektvermarkterUebersichtPage';
import DirektvermarkterDetailPage from './pages/DirektvermarkterDetailPage';
import DirektvermarkterMapPage from './pages/DirektvermarkterMapPage';
import WettbewerbPage from './pages/WettbewerbPage';

// Admin-Komponenten importieren
import { AuthProvider } from './contexts/AuthContext';
import { VendorAuthProvider } from './contexts/VendorAuthContext';
import { StoreSettingsProvider } from './contexts/StoreSettingsContext';
import ProtectedRoute from './components/admin/ProtectedRoute';
import VendorProtectedRoute from './components/vendor/VendorProtectedRoute';
import LoginPage from './pages/admin/LoginPage';
import SetupPage from './pages/admin/SetupPage';
import DashboardPage from './pages/admin/DashboardPage';
import NewsletterPage from './pages/admin/NewsletterPage';
import UsersPage from './pages/admin/UsersPage';
import MietfaecherPage from './pages/admin/MietfaecherPage';
import VertraegeePage from './pages/admin/VertraegeePage';
import ContactsPage from './pages/admin/ContactsPage';
import PendingBookingsPage from './pages/admin/PendingBookingsPage';
import VendorContestPage from './pages/admin/VendorContestPage';
import UnauthorizedPage from './pages/admin/UnauthorizedPage';
import SettingsPage from './pages/admin/SettingsPage';

// Layout-Komponente für öffentliche Seiten mit Hero
const PublicLayoutWithHero: React.FC = () => {
  return (
    <PublicLayout>
      <Hero />
      <Outlet />
    </PublicLayout>
  );
};

// AppContent ist die Haupt-Routing-Komponente
const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Admin-Routen */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin/setup" element={<SetupPage />} />
      <Route path="/admin/unauthorized" element={<UnauthorizedPage />} />
      
      {/* Geschützte Admin-Routen */}
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route index element={<DashboardPage />} />
        <Route path="newsletter" element={<NewsletterPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="mietfaecher" element={<MietfaecherPage />} />
        <Route path="vertraege" element={<VertraegeePage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="pending-bookings" element={<PendingBookingsPage />} />
        <Route path="vendor-contest" element={<VendorContestPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      {/* Vendor-Routen */}
      <Route path="/vendor/login" element={<VendorLoginPage />} />
      <Route path="/vendor/confirm" element={<VendorConfirmPage />} />
      
      {/* Geschützte Vendor-Routen */}
      <Route path="/vendor" element={<VendorProtectedRoute />}>
        <Route path="dashboard" element={<VendorDashboardPage />} />
        <Route path="profile" element={<VendorProfilePage />} />
        <Route path="contracts" element={<VendorContractsPage />} />
        {/* Weitere Vendor-Routen können hier hinzugefügt werden */}
      </Route>
      
      {/* Öffentliche Routen mit Hero auf der Startseite */}
      <Route path="/" element={<PublicLayoutWithHero />}>
        <Route index element={<HomePage />} />
      </Route>
      
      {/* Öffentliche Routen mit normaler Navigation */}
      <Route element={<PublicLayout><Outlet /></PublicLayout>}>
        <Route path="/direktvermarkter" element={<DirektvermarkterPage />} />
        <Route path="/direktvermarkter/uebersicht" element={<DirektvermarkterUebersichtPage />} />
        <Route path="/direktvermarkter/karte" element={<DirektvermarkterMapPage />} />
        <Route path="/direktvermarkter/:id" element={<DirektvermarkterDetailPage />} />
        <Route path="/vendors" element={<WettbewerbPage />} />
        <Route path="/standort" element={<StandortPage />} />
        <Route path="/mieten" element={<MietenPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/kontakt" element={<KontaktPage />} />
        <Route path="/newsletter/confirm" element={<NewsletterConfirmPage />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <VendorAuthProvider>
        <StoreSettingsProvider>
          <Router>
            <AppContent />
          </Router>
        </StoreSettingsProvider>
      </VendorAuthProvider>
    </AuthProvider>
  );
}

export default App;