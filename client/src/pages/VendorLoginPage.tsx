/**
 * @file VendorLoginPage.tsx
 * @purpose Vendor authentication login page with form validation, error handling,
 *          "forgot password" link, and resend confirmation email support
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Send } from 'lucide-react';
import axios from 'axios';
import { useVendorAuth } from '../contexts/VendorAuthContext';

const VendorLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [isResending, setIsResending] = useState(false);

  const { login } = useVendorAuth();
  const navigate = useNavigate();

  const validateEmail = (emailValue: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Bitte füllen Sie alle Felder aus');
      return;
    }

    if (!validateEmail(email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    setIsLoading(true);
    setError('');
    setShowResendConfirmation(false);
    setResendSuccess('');

    try {
      const result = await login(email, password);

      if (result.success) {
        navigate('/vendor/dashboard');
      } else {
        const message = result.message || 'Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.';
        setError(message);

        // Zeige "Bestätigungslink erneut senden" wenn E-Mail nicht bestätigt
        if (message.includes('bestätige') || message.includes('E-Mail-Adresse')) {
          setShowResendConfirmation(true);
        }
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später noch einmal.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setIsResending(true);
    setResendSuccess('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await axios.post(`${apiUrl}/vendor-auth/resend-confirmation`, { email });

      if (response.data.success) {
        setResendSuccess(response.data.message);
        setShowResendConfirmation(false);
        setError('');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold text-center text-secondary mb-6">
            Direktvermarkter Login
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="ihre.email@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                  Passwort
                </label>
                <Link
                  to="/vendor/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ihr Passwort"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                  <span className="text-red-700">{error}</span>
                </div>
                {showResendConfirmation && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="mt-3 flex items-center text-sm text-primary hover:underline font-medium disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {isResending ? 'Wird gesendet...' : 'Bestätigungslink erneut senden'}
                  </button>
                )}
              </div>
            )}

            {resendSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                <span className="text-green-700">{resendSuccess}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90
                         transition-all duration-200 flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Anmelden...
                  </>
                ) : (
                  'Anmelden'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Noch kein Account?{' '}
              <Link to="/pricing" className="text-primary hover:underline font-medium">
                Jetzt als Direktvermarkter registrieren
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-gray-500 hover:text-gray-700 text-sm">
              Zurück zur Startseite
            </Link>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="text-center text-sm text-gray-600">
            <p>Bei Fragen oder Problemen:</p>
            <p className="mt-1">
              <a href="mailto:info@housnkuh.de" className="text-primary hover:underline">
                info@housnkuh.de
              </a>{' '}
              oder{' '}
              <a href="tel:+4915222035788" className="text-primary hover:underline">
                0152 22035788
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorLoginPage;
