/**
 * @file AppContent.tsx
 * @purpose Main routing component that defines all application routes with lazy loading
 * @created 2025-01-15
 * @modified 2025-08-12
 */
import React, { Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Hero from './layout/Hero';
import PublicLayout from './layout/PublicLayout';
import HomePage from '../pages/HomePage';
import DirektvermarkterPage from '../pages/DirektvermarkterPage';
import StandortPage from '../pages/StandortPage';
import MietenPage from '../pages/MietenPage';
import KontaktPage from '../pages/KontaktPage';
import PricingPage from '../pages/PricingPage';
import NewsletterConfirmPage from '../pages/NewsletterConfirmPage';
import VendorConfirmPage from '../pages/VendorConfirmPage';
import VendorLoginPage from '../pages/VendorLoginPage';
import DirektvermarkterUebersichtPage from '../pages/DirektvermarkterUebersichtPage';
import DirektvermarkterDetailPage from '../pages/DirektvermarkterDetailPage';
import DirektvermarkterMapPage from '../pages/DirektvermarkterMapPage';
import WettbewerbPage from '../pages/WettbewerbPage';
import ImpressumPage from '../pages/ImpressumPage';
import DatenschutzPage from '../pages/DatenschutzPage';
import AGBPage from '../pages/AGBPage';
import FAQPage from '../pages/FAQPage';

// Admin-Komponenten - Core imports
import ProtectedRoute from './admin/ProtectedRoute';
import VendorProtectedRoute from './vendor/VendorProtectedRoute';

// Lazy load heavy admin and vendor components for better performance
const VendorDashboardPage = React.lazy(() => import('../pages/VendorDashboardPage'));
const VendorProfilePage = React.lazy(() => import('../pages/vendor/VendorProfilePage'));
const MeineBuchungenPage = React.lazy(() => import('../pages/vendor/MeineBuchungenPage'));
const VendorProductsPage = React.lazy(() => import('../pages/vendor/VendorProductsPage'));
const VendorReportsPage = React.lazy(() => import('../pages/vendor/VendorReportsPage'));
const VendorCustomerInvoicesPage = React.lazy(() => import('../pages/vendor/VendorCustomerInvoicesPage'));
const VendorHousnkuhInvoicesPage = React.lazy(() => import('../pages/vendor/VendorHousnkuhInvoicesPage'));

// Lazy load admin components for code splitting
const LoginPage = React.lazy(() => import('../pages/admin/LoginPage'));
const SetupPage = React.lazy(() => import('../pages/admin/SetupPage'));
const DashboardPage = React.lazy(() => import('../pages/admin/DashboardPage'));
const NewsletterPage = React.lazy(() => import('../pages/admin/NewsletterPage'));
const UsersPage = React.lazy(() => import('../pages/admin/UsersPage'));
const MietfaecherPage = React.lazy(() => import('../pages/admin/MietfaecherPage'));
const VertraegeePage = React.lazy(() => import('../pages/admin/VertraegeePage'));
const ContactsPage = React.lazy(() => import('../pages/admin/ContactsPage'));
const PendingBookingsPage = React.lazy(() => import('../pages/admin/PendingBookingsPage'));
const VendorContestPage = React.lazy(() => import('../pages/admin/VendorContestPage'));
const UnauthorizedPage = React.lazy(() => import('../pages/admin/UnauthorizedPage'));
const SettingsPage = React.lazy(() => import('../pages/admin/SettingsPage'));
const TagsPage = React.lazy(() => import('../pages/admin/TagsPage'));
const FAQManagementPage = React.lazy(() => import('../pages/admin/FAQManagementPage'));
const RevenueOverviewPage = React.lazy(() => import('../pages/admin/RevenueOverviewPage'));
const ZusatzleistungenPage = React.lazy(() => import('../pages/admin/ZusatzleistungenPage'));
const EmailTemplatesPage = React.lazy(() => import('../pages/admin/EmailTemplatesPage'));

/**
 * Loading spinner component displayed while lazy-loaded components are being loaded
 * @returns {JSX.Element} Animated spinning loader with orange accent
 */
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
  </div>
);

/**
 * Layout wrapper component for public pages that includes the Hero section
 * Used specifically for the homepage to display hero banner above content
 * @returns {JSX.Element} PublicLayout with Hero section and outlet for child routes
 */
const PublicLayoutWithHero: React.FC = () => {
  return (
    <PublicLayout>
      <Hero />
      <Outlet />
    </PublicLayout>
  );
};

/**
 * Main application routing component that defines all routes with proper authentication
 * and lazy loading. Authentication providers are now globally available via SharedProviderWrapper.
 * 
 * Features:
 * - Lazy loading for performance optimization
 * - Global authentication contexts available on all routes
 * - Protected routes with role-based access control
 * - Fallback loading states for all lazy-loaded components
 * - Organized route structure: admin, vendor, and public routes
 * 
 * @returns {JSX.Element} Complete application routing structure
 */
const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Admin-Routen */}
      <Route path="/admin/login" element={
        <Suspense fallback={<LoadingSpinner />}>
          <LoginPage />
        </Suspense>
      } />
      <Route path="/admin/setup" element={
        <Suspense fallback={<LoadingSpinner />}>
          <SetupPage />
        </Suspense>
      } />
      <Route path="/admin/unauthorized" element={
        <Suspense fallback={<LoadingSpinner />}>
          <UnauthorizedPage />
        </Suspense>
      } />
      
      {/* Geschützte Admin-Routen */}
      <Route path="/admin/*" element={
        <ProtectedRoute />
      }>
        <Route index element={
          <Suspense fallback={<LoadingSpinner />}>
            <DashboardPage />
          </Suspense>
        } />
        <Route path="newsletter" element={
          <Suspense fallback={<LoadingSpinner />}>
            <NewsletterPage />
          </Suspense>
        } />
        <Route path="email-templates" element={
          <Suspense fallback={<LoadingSpinner />}>
            <EmailTemplatesPage />
          </Suspense>
        } />
        <Route path="users" element={
          <Suspense fallback={<LoadingSpinner />}>
            <UsersPage />
          </Suspense>
        } />
        <Route path="tags" element={
          <Suspense fallback={<LoadingSpinner />}>
            <TagsPage />
          </Suspense>
        } />
        <Route path="mietfaecher" element={
          <Suspense fallback={<LoadingSpinner />}>
            <MietfaecherPage />
          </Suspense>
        } />
        <Route path="vertraege" element={
          <Suspense fallback={<LoadingSpinner />}>
            <VertraegeePage />
          </Suspense>
        } />
        <Route path="zusatzleistungen" element={
          <Suspense fallback={<LoadingSpinner />}>
            <ZusatzleistungenPage />
          </Suspense>
        } />
        <Route path="contacts" element={
          <Suspense fallback={<LoadingSpinner />}>
            <ContactsPage />
          </Suspense>
        } />
        <Route path="pending-bookings" element={
          <Suspense fallback={<LoadingSpinner />}>
            <PendingBookingsPage />
          </Suspense>
        } />
        <Route path="vendor-contest" element={
          <Suspense fallback={<LoadingSpinner />}>
            <VendorContestPage />
          </Suspense>
        } />
        <Route path="settings" element={
          <Suspense fallback={<LoadingSpinner />}>
            <SettingsPage />
          </Suspense>
        } />
        <Route path="faq" element={
          <Suspense fallback={<LoadingSpinner />}>
            <FAQManagementPage />
          </Suspense>
        } />
        <Route path="revenue" element={
          <Suspense fallback={<LoadingSpinner />}>
            <RevenueOverviewPage />
          </Suspense>
        } />
      </Route>
      
      {/* Vendor-Routen */}
      <Route path="/vendor/login" element={
        <VendorLoginPage />
      } />
      <Route path="/vendor/confirm" element={<VendorConfirmPage />} />
      
      {/* Geschützte Vendor-Routen */}
      <Route path="/vendor/*" element={
        <VendorProtectedRoute />
      }>
        <Route path="dashboard" element={
          <Suspense fallback={<LoadingSpinner />}>
            <VendorDashboardPage />
          </Suspense>
        } />
        <Route path="profile" element={
          <Suspense fallback={<LoadingSpinner />}>
            <VendorProfilePage />
          </Suspense>
        } />
        <Route path="meine-buchungen" element={
          <Suspense fallback={<LoadingSpinner />}>
            <MeineBuchungenPage />
          </Suspense>
        } />
        <Route path="products" element={
          <Suspense fallback={<LoadingSpinner />}>
            <VendorProductsPage />
          </Suspense>
        } />
        <Route path="reports" element={
          <Suspense fallback={<LoadingSpinner />}>
            <VendorReportsPage />
          </Suspense>
        } />
        <Route path="customer-invoices" element={
          <Suspense fallback={<LoadingSpinner />}>
            <VendorCustomerInvoicesPage />
          </Suspense>
        } />
        <Route path="housnkuh-invoices" element={
          <Suspense fallback={<LoadingSpinner />}>
            <VendorHousnkuhInvoicesPage />
          </Suspense>
        } />
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
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/datenschutz" element={<DatenschutzPage />} />
        <Route path="/agb" element={<AGBPage />} />
        <Route path="/faq" element={<FAQPage />} />
      </Route>
    </Routes>
  );
};

export default AppContent;