// client/src/pages/VendorConfirmPage.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Check, AlertCircle, Loader, Package, User } from 'lucide-react';
import axios from 'axios';
//import { useVendorAuth } from '../contexts/VendorAuthContext';

const VendorConfirmPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [userConfirmed, setUserConfirmed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
 // const { login } = useVendorAuth();

  useEffect(() => {
    const confirmAccount = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Kein Bestätigungstoken gefunden.');
        return;
      }
      
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        
        const response = await axios.get(`${apiUrl}/vendor-auth/confirm/${token}`);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Account erfolgreich bestätigt!');
          setUserConfirmed(true);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Ein Fehler ist aufgetreten bei der Bestätigung.');
        }
      } catch (error) {
        setStatus('error');
        if (axios.isAxiosError(error) && error.response) {
          setMessage(error.response.data.message || 'Fehler bei der Bestätigung des Accounts.');
        } else {
          setMessage('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
        }
      }
    };
    
    confirmAccount();
  }, [location]);

  const handleLoginRedirect = () => {
    // Hier könnten Sie direkt ein Login-Modal öffnen oder zur Login-Seite weiterleiten
    navigate('/pricing'); // Zurück zur Buchungsseite
  };

  return (
    <div className="max-w-3xl mx-auto p-8 my-12 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-secondary">
        Account-Bestätigung
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
              Willkommen bei housnkuh!
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              {message}
            </p>
            
            {userConfirmed && (
              <div className="bg-blue-50 p-6 rounded-lg mb-8 max-w-md">
                <div className="flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-900">
                    Nächste Schritte
                  </h3>
                </div>
                <div className="text-left space-y-3 text-blue-800">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                    <span>Ihr Account ist jetzt aktiv und Sie können sich anmelden</span>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                    <span>Wir nehmen in Kürze Kontakt mit Ihnen auf, um Details zu besprechen</span>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                    <span>Nach der finalen Abstimmung erstellen wir Ihren Vertrag</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={handleLoginRedirect}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg 
                         transition-all duration-200 font-medium flex items-center gap-2"
              >
                <User className="w-5 h-5" />
                <span>Anmelden</span>
              </button>
              <Link 
                to="/"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg 
                         transition-all duration-200 font-medium"
              >
                Zurück zur Startseite
              </Link>
            </div>
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
              Falls der Link abgelaufen ist, können Sie sich gerne direkt bei uns melden.
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
      
      {/* Kontakt-Information */}
      <div className="mt-8 text-center border-t pt-6">
        <h3 className="text-lg font-semibold text-secondary mb-2">
          Haben Sie Fragen?
        </h3>
        <p className="text-gray-600">
          Telefon: 0157 35711257<br/>
          E-Mail: eva-maria.schaller@housnkuh.de
        </p>
      </div>
    </div>
  );
};

export default VendorConfirmPage;