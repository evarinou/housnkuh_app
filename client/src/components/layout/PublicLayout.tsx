/**
 * @file PublicLayout.tsx
 * @purpose Layout wrapper component for public pages providing consistent page structure
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import ContestBanner from '../ContestBanner';
import CookieBanner from '../CookieBanner';

/**
 * Props interface for PublicLayout component
 * @interface PublicLayoutProps
 * @property {React.ReactNode} children - Page content to be rendered within the layout
 */
interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Public layout wrapper component providing consistent structure for public pages
 * 
 * This component establishes the standard layout pattern for all public-facing pages
 * including the main navigation, content area, footer, and additional overlays.
 * 
 * Layout Structure:
 * - Navigation: Fixed header with authentication-aware navigation
 * - Main Content: Flexible content area with proper top padding for fixed nav
 * - Footer: Site-wide footer with contact info and legal links
 * - Contest Banner: Promotional banner for vendor contests
 * - Cookie Banner: GDPR compliance cookie consent banner
 * 
 * Features:
 * - Full-height layout using flexbox
 * - Consistent top padding to account for fixed navigation
 * - Proper stacking of overlays and banners
 * - Responsive design considerations
 * 
 * @param {PublicLayoutProps} props - Component props
 * @param {React.ReactNode} props.children - Page content to render
 * @returns {JSX.Element} The complete public page layout structure
 */
const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-grow pt-24">
        {children}
      </main>
      <Footer />
      <ContestBanner />
      <CookieBanner />
    </div>
  );
};

export default PublicLayout;