/**
 * @file VendorSettingsPage.tsx
 * @purpose Vendor settings page with password change functionality
 */
import React, { useState } from 'react';
import { Settings, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { apiUtils } from '../../utils/auth';
import VendorLayout from '../../components/vendor/VendorLayout';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { PasswordRequirementsChecklist } from '../../components/common/PasswordRequirementsChecklist';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX } from '../../constants/validation';

const VendorSettingsPage: React.FC = () => {
  const { token } = useVendorAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isPasswordValid = newPassword.length >= PASSWORD_MIN_LENGTH && PASSWORD_REGEX.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit = currentPassword && isPasswordValid && passwordsMatch && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const apiUrl = apiUtils.getApiUrl();
      const response = await axios.put(
        `${apiUrl}/vendor-auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccess('Passwort erfolgreich geändert!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Fehler beim Ändern des Passworts. Bitte versuche es erneut.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VendorLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Settings className="w-8 h-8 text-gray-600 mr-3" />
            <h1 className="text-2xl font-bold text-secondary">Einstellungen</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <Lock className="w-5 h-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-secondary">Passwort ändern</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Aktuelles Passwort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currentPassword">
                Aktuelles Passwort
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Neues Passwort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">
                Neues Passwort
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {newPassword && <PasswordRequirementsChecklist password={newPassword} />}
            </div>

            {/* Passwort bestätigen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
                Neues Passwort bestätigen
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-300'
                }`}
                autoComplete="new-password"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-sm text-red-600">Die Passwörter stimmen nicht überein</p>
              )}
            </div>

            {/* Fehler/Erfolg */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                <span className="text-green-700">{success}</span>
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
                  Wird geändert...
                </>
              ) : (
                'Passwort ändern'
              )}
            </button>
          </form>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorSettingsPage;
