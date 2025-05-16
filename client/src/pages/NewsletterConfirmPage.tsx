// client/src/pages/NewsletterConfirmPage.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Check, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';

const NewsletterConfirmPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    const confirmNewsletter = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Kein Bestätigungstoken gefunden.');
        return;
      }
      
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        
        const response = await axios.get(`${apiUrl}/newsletter/confirm/${token}`);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Newsletter-Anmeldung erfolgreich bestätigt!');
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Ein Fehler ist aufgetreten bei der Bestätigung.');
        }
      } catch (error) {
        setStatus('error');
        if (axios.isAxiosError(error) && error.response) {
          setMessage(error.response.data.message || 'Fehler bei der Bestätigung der Newsletter-Anmeldung.');
        } else {
          setMessage('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
        }
      }
    };
    
    confirmNewsletter();
  }, [location]);

  return (
    <div className="max-w-3xl mx-auto p-8 my-12 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-secondary">
        Newsletter-Bestätigung
      </h1>
      
      <div className="flex flex-col items-center justify-center p-6 text-center">
        {status === 'loading' && (
          <>
            <Loader className="w-16 h-16 text-primary animate-spin mb-4" />
            <p className="text-xl">Bestätigung wird verarbeitet...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="bg-green-100 p-4 rounded-full mb-6">
              <Check className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-secondary">
              Vielen Dank für Ihre Bestätigung!
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              {message}
            </p>
            <p className="text-gray-600 mb-8">
              Sie erhalten nun regelmäßig Updates von housnkuh.
            </p>
            <Link 
              to="/"
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg 
                       transition-all duration-200 font-medium"
            >
              Zurück zur Startseite
            </Link>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="bg-red-100 p-4 rounded-full mb-6">
              <AlertCircle className="w-16 h-16 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-secondary">
              Bestätigung fehlgeschlagen
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              {message}
            </p>
            <p className="text-gray-600 mb-8">
              Versuchen Sie es später erneut oder kontaktieren Sie uns.
            </p>
            <div className="flex gap-4">
              <Link 
                to="/"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg 
                         transition-all duration-200 font-medium"
              >
                Zurück zur Startseite
              </Link>
              <Link 
                to="/kontakt"
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg 
                         transition-all duration-200 font-medium"
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewsletterConfirmPage;
export {}; 