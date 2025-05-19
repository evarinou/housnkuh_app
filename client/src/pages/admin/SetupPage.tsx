// client/src/pages/admin/SetupPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../components/assets/logo.svg';

const SetupPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // EINFACHE LÖSUNG: Setup immer erlauben
  useEffect(() => {
    setSetupComplete(false);
  }, []);
  
  // Wenn bereits eingeloggt, zum Dashboard weiterleiten
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);
  
  /* // Rest der Komponente bleibt gleich...
        
        // Wenn keine 404-Fehlermeldung kommt, dann existiert bereits ein Admin
        setSetupComplete(true);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          // 404-Fehler bedeutet, dass die API existiert, aber kein Admin gefunden wurde
          setSetupComplete(false);
        } else {
          // Bei anderen Fehlern gehen wir davon aus, dass ein Admin existiert
          setSetupComplete(true);
        }
      }
    };
    
    checkAdminSetup();
  }, []);
  
const checkAdminSetup = async () => {
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    const response = await axios.get(`${apiUrl}/auth/setup-status`);
    
    if (response.data.success) {
      setSetupComplete(!response.data.setupRequired);
    } else {
      setSetupComplete(false);
    }
  } catch (error) {
    console.error('Setup-Status-Check-Fehler:', error);
    setSetupComplete(false); 
  }
};*/
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Formularvalidierung
    if (!username || !password || !confirmPassword || !name || !email || !setupKey) {
      setError('Bitte füllen Sie alle Felder aus');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await axios.post(`${apiUrl}/auth/setup`, {
        username,
        password,
        name,
        email,
        setupKey
      });
      
      if (response.data.success) {
        // Setup erfolgreich, zur Login-Seite weiterleiten
        alert('Admin-Account erfolgreich erstellt. Sie können sich jetzt anmelden.');
        navigate('/admin/login');
      } else {
        setError(response.data.message || 'Ein Fehler ist aufgetreten');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || 'Ein Fehler ist aufgetreten');
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
      console.error('Setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Wenn Setup bereits abgeschlossen ist, Ladeanimation anzeigen
  if (setupComplete || isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img className="mx-auto h-20 w-auto" src={logo} alt="housnkuh" />
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Admin-Konto einrichten
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Erstellen Sie das erste Administrator-Konto für den housnkuh Admin-Bereich
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Benutzername</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Benutzername"
              />
            </div>
            <div>
              <label htmlFor="name" className="sr-only">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Vollständiger Name"
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">E-Mail</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="E-Mail-Adresse"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Passwort</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Passwort"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">Passwort bestätigen</label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Passwort bestätigen"
              />
            </div>
            <div>
              <label htmlFor="setup-key" className="sr-only">Setup-Schlüssel</label>
              <input
                id="setup-key"
                name="setup-key"
                type="password"
                required
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Setup-Schlüssel"
              />
            </div>
          </div>
          
          {error && (
            <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {isLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Shield className="h-5 w-5 text-white" />
                )}
              </span>
              {isLoading ? 'Wird eingerichtet...' : 'Admin-Konto erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetupPage;