/**
 * @file VendorResetPasswordPage.tsx
 * @purpose Page for vendors to set a new password using a reset token from email
 */
import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { apiUtils } from '../../utils/auth';
import { PasswordRequirementsChecklist } from '../../components/common/PasswordRequirementsChecklist';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX } from '../../constants/validation';

const VendorResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isPasswordValid = newPassword.length >= PASSWORD_MIN_LENGTH && PASSWORD_REGEX.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit = token && isPasswordValid && passwordsMatch && !isSubmitting;

  if (!token) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-secondary mb-2">Ungültiger Link</h1>
          <p className="text-gray-600 mb-4">
            Dieser Reset-Link ist ungültig. Bitte fordere einen neuen an.
          </p>
          <Link to="/vendor/forgot-password" className="text-primary hover:underline font-medium">
            Neuen Reset-Link anfordern
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError('');

    try {
      const apiUrl = apiUtils.getApiUrl();
      const response = await axios.post(`${apiUrl}/vendor-auth/reset-password`, {
        token,
        newPassword
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/vendor/login'), 3000);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Fehler beim Zurücksetzen. Bitte versuche es erneut.');
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
            Neues Passwort festlegen
          </h1>
          <p className="text-center text-gray-500 mb-6">
            Gib dein neues Passwort ein.
          </p>

          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-700 font-medium">Passwort erfolgreich geändert!</p>
                    <p className="text-green-600 text-sm mt-1">
                      Du wirst in wenigen Sekunden zum Login weitergeleitet...
                    </p>
                  </div>
                </div>
              </div>
              <Link
                to="/vendor/login"
                className="flex items-center justify-center text-primary hover:underline font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Jetzt zum Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Neues Passwort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">
                  Neues Passwort
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Neues Passwort"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {newPassword && <PasswordRequirementsChecklist password={newPassword} />}
              </div>

              {/* Passwort bestätigen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
                  Passwort bestätigen
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Passwort bestätigen"
                  autoComplete="new-password"
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="mt-1 text-sm text-red-600">Die Passwörter stimmen nicht überein</p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Wird gespeichert...
                  </>
                ) : (
                  'Passwort speichern'
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

export default VendorResetPasswordPage;
