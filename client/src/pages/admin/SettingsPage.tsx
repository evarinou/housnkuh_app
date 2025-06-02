import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Save, AlertCircle, CheckCircle } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState({
    enabled: false,
    openingDate: '',
    isStoreOpen: false,
    lastModified: null as Date | null,
    modifiedBy: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Nicht authentifiziert');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${apiUrl}/admin/settings/store-opening`, {
        headers: {
          'x-auth-token': token
        }
      });

      if (response.data.success) {
        const data = response.data.settings;
        setSettings({
          enabled: data.enabled,
          openingDate: data.openingDate ? new Date(data.openingDate).toISOString().split('T')[0] : '',
          isStoreOpen: data.isStoreOpen,
          lastModified: data.lastModified ? new Date(data.lastModified) : null,
          modifiedBy: data.modifiedBy || ''
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Nicht authentifiziert');
        setSaving(false);
        return;
      }
      
      const response = await axios.put(`${apiUrl}/admin/settings/store-opening`, {
        enabled: settings.enabled,
        openingDate: settings.openingDate || null
      }, {
        headers: {
          'x-auth-token': token
        }
      });

      if (response.data.success) {
        setSuccess('Einstellungen erfolgreich gespeichert');
        // Refresh settings to get updated data
        await fetchSettings();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.message || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Zurück zum Dashboard
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-gray-900">Eröffnungsdatum Einstellungen</h2>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="h-5 w-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-gray-700 font-medium">
                Eröffnungsdatum aktivieren
              </span>
            </label>
            <p className="mt-1 ml-8 text-sm text-gray-500">
              Wenn aktiviert, wird das Eröffnungsdatum auf der Website angezeigt und Probemonate starten automatisch.
            </p>
          </div>

          <div>
            <label htmlFor="openingDate" className="block text-sm font-medium text-gray-700 mb-2">
              Eröffnungsdatum
            </label>
            <input
              type="date"
              id="openingDate"
              value={settings.openingDate}
              onChange={(e) => setSettings({ ...settings, openingDate: e.target.value })}
              disabled={!settings.enabled}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {settings.openingDate && (
              <p className="mt-2 text-sm text-gray-600">
                {settings.isStoreOpen ? (
                  <span className="text-green-600 font-medium">✓ Der Laden ist bereits eröffnet</span>
                ) : (
                  <span>
                    Eröffnung in {Math.ceil((new Date(settings.openingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Tagen
                  </span>
                )}
              </p>
            )}
          </div>

          {settings.lastModified && (
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p>
                Zuletzt geändert am {settings.lastModified.toLocaleDateString('de-DE')} um{' '}
                {settings.lastModified.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                {settings.modifiedBy && ` von ${settings.modifiedBy}`}
              </p>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Einstellungen speichern
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Hinweise:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Das Eröffnungsdatum kann nicht in der Vergangenheit liegen</li>
            <li>• Bei Änderung des Datums werden alle vorregistrierten Vendors benachrichtigt</li>
            <li>• Probemonate starten automatisch am Eröffnungstag um 00:00 Uhr</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;