/**
 * @file Footer.tsx
 * @purpose Application footer with contact info, legal links, and social media integration
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook } from 'lucide-react';

/**
 * Footer component providing site-wide navigation and company information
 * 
 * Features:
 * - Four-column responsive layout
 * - Contact information (address, phone, email)
 * - Opening hours with card access information
 * - Legal page navigation (Impressum, Datenschutz, AGB, FAQ)
 * - Social media links (Instagram, Facebook, TikTok)
 * - Hover effects and smooth transitions
 * - Custom TikTok SVG icon implementation
 * - Responsive grid that collapses on mobile
 * 
 * @returns {JSX.Element} The complete footer section with all navigation and info
 */
const Footer: React.FC = () => {
  return (
    <footer className="bg-[var(--secondary)] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Kontakt Sektion */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Kontakt</h3>
            <div className="space-y-2">
              <p>Strauer Str. 15</p>
              <p>96317 Kronach</p>
              <p>Tel: 0152/22035788</p>
              <p>E-Mail: eva-maria.schaller@housnkuh.de</p>
            </div>
          </div>

          {/* Öffnungszeiten Sektion */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Öffnungszeiten</h3>
            <div className="space-y-2">
              <p>Erweiterte Öffnungszeiten</p>
              <p className="text-sm">(Zugang mit EC- oder Kreditkarte)</p>
            </div>
          </div>

          {/* Rechtliches Sektion */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Rechtliches</h3>
            <nav className="space-y-2">
              <p>
                <Link 
                  to="/impressum" 
                  className="hover:text-[var(--primary)] transition-colors duration-200"
                >
                  Impressum
                </Link>
              </p>
              <p>
                <Link 
                  to="/datenschutz" 
                  className="hover:text-[var(--primary)] transition-colors duration-200"
                >
                  Datenschutz
                </Link>
              </p>
              <p>
                <Link 
                  to="/agb" 
                  className="hover:text-[var(--primary)] transition-colors duration-200"
                >
                  AGB
                </Link>
              </p>
              <p>
                <Link 
                  to="/faq" 
                  className="hover:text-[var(--primary)] transition-colors duration-200"
                >
                  FAQ
                </Link>
              </p>
            </nav>
          </div>

          {/* Social Media Sektion */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Social Media</h3>
            <div className="flex items-center gap-4">
              <a 
                href="https://www.instagram.com/housnkuh_kc/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors duration-200"
              >
                <Instagram size={20} />
                <span>Instagram</span>
              </a>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <a 
                href="https://www.facebook.com/profile.php?id=61573920170563" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors duration-200"
              >
                <Facebook size={20} />
                <span>Facebook</span>
              </a>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <a 
                href="https://www.tiktok.com/@housnkuh" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors duration-200"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M9 12a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
                  <path d="M15 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
                  <path d="M15 8v8a4 4 0 0 1-4 4"/>
                  <line x1="9" y1="12" x2="15" y2="8"/>
                </svg>
                <span>TikTok</span>
              </a>
            </div>
          </div>
        </div>
        {/* Optionale Copyright-Information 
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} housnkuh - Alle Rechte vorbehalten</p>
        </div> */}
      </div>
    </footer>
  );
};

export default Footer;