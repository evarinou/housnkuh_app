/**
 * @file VendorForgotPasswordPage.tsx
 * @purpose Page for vendors to request a password reset link via email
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const VendorForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Bitte gib deine E-Mail-Adresse ein');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      await axios.post(`${apiUrl}/vendor-auth/request-password-reset`, { email });
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Fehler beim Senden. Bitte versuche es erneut.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold text-center text-secondary mb-2">
            Passwort vergessen?
          </h1>
          <p className="text-center text-gray-500 mb-6">
            Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
          </p>

          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-700 font-medium">E-Mail gesendet!</p>
                    <p className="text-green-600 text-sm mt-1">
                      Falls ein Account mit dieser E-Mail existiert, haben wir einen Link zum
                      Zurücksetzen des Passworts gesendet. Bitte prüfe auch deinen Spam-Ordner.
                    </p>
                  </div>
                </div>
              </div>
              <Link
                to="/vendor/login"
                className="flex items-center justify-center text-primary hover:underline font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Zurück zum Login
              </Link>
            </div>
          ) : (
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
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90
                         transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Wird gesendet...
                  </>
                ) : (
                  'Reset-Link senden'
                )}
              </button>

              <div className="text-center">
                <Link to="/vendor/login" className="text-primary hover:underline text-sm font-medium">
                  <ArrowLeft className="w-4 h-4 inline mr-1" />
                  Zurück zum Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorForgotPasswordPage;
