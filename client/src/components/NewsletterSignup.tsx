// client/src/components/NewsletterSignup.tsx - Debug-Version
import React, { useState } from 'react';
import { Send, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

const NewsletterSignup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'customer' | 'vendor'>('customer');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setMessage('');
    setDebugInfo('');
    
    // Debug-Informationen sammeln
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    const requestData = { email, name, type };
    
    console.log('Newsletter submission:', {
      apiUrl,
      requestData,
      headers: { 'Content-Type': 'application/json' }
    });
    
    setDebugInfo(`API URL: ${apiUrl}/newsletter/subscribe`);
    
    try {
      const response = await axios.post(`${apiUrl}/newsletter/subscribe`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 Sekunden Timeout
      });
      
      console.log('Newsletter response:', response);
      
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        setEmail('');
        setName('');
        setDebugInfo(debugInfo + `\nErfolg: ${response.status}`);
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Ein Fehler ist aufgetreten.');
        setDebugInfo(debugInfo + `\nFehler in Response: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error('Newsletter error:', error);
      setStatus('error');
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Server hat mit einem Fehlercode geantwortet
          setMessage(error.response.data?.message || `Server-Fehler: ${error.response.status}`);
          setDebugInfo(debugInfo + `\nServer-Fehler: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          // Request wurde gesendet, aber keine Antwort erhalten
          setMessage('Keine Antwort vom Server erhalten. Ist der Server gestartet?');
          setDebugInfo(debugInfo + `\nKeine Antwort: ${error.message}`);
        } else {
          // Fehler beim Erstellen des Requests
          setMessage('Fehler beim Senden der Anfrage.');
          setDebugInfo(debugInfo + `\nRequest-Fehler: ${error.message}`);
        }
      } else {
        setMessage('Ein unbekannter Fehler ist aufgetreten.');
        setDebugInfo(debugInfo + `\nUnbekannter Fehler: ${error}`);
      }
    }
  };

  return (
    <div className="bg-secondary text-white rounded-lg p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Bleib informiert!</h2>
      <p className="mb-6">
        Melde dich für den Newsletter an und erfahre als Erste/r von der Eröffnung.
      </p>
      
      {status === 'success' ? (
        <div className="flex items-center justify-center text-lg">
          <Check className="mr-2" />
          {message || 'Vielen Dank für deine Anmeldung! Bitte bestätige deine E-Mail-Adresse.'}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name (optional)"
              className="px-4 py-2 rounded-lg text-gray-900 w-full sm:w-auto"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Deine E-Mail-Adresse"
              className="px-4 py-2 rounded-lg text-gray-900 w-full sm:w-auto"
              required
            />
          </div>
          
          <div className="flex items-center justify-center gap-4 text-white">
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                value="customer"
                checked={type === 'customer'}
                onChange={() => setType('customer')}
                className="mr-2"
              />
              Kunde
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                value="vendor"
                checked={type === 'vendor'}
                onChange={() => setType('vendor')}
                className="mr-2"
              />
              Direktvermarkter
            </label>
          </div>
          
          <div className="flex justify-center mt-4">
            <button 
              type="submit"
              disabled={status === 'submitting'}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 
                      transition-all duration-200 flex items-center justify-center gap-2
                      disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? (
                'Wird angemeldet...'
              ) : (
                <>
                  <span>Anmelden</span>
                  <Send size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      )}
      
      {status === 'error' && (
        <div className="mt-4 p-4 bg-red-600 text-white rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
          {debugInfo && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm underline">Debug-Informationen anzeigen</summary>
              <pre className="text-xs bg-red-800 p-2 rounded mt-2 text-left whitespace-pre-wrap">
                {debugInfo}
              </pre>
            </details>
          )}
        </div>
      )}
      
      {/* Entwicklungs-Hilfsmittel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg text-xs text-left">
          <h4 className="font-bold mb-2">Debug-Info:</h4>
          <p>API URL: {process.env.REACT_APP_API_URL || 'http://localhost:4000/api'}</p>
          <p>Current State: {status}</p>
          <p>Form Data: {JSON.stringify({ email, name, type })}</p>
        </div>
      )}
    </div>
  );
};

export default NewsletterSignup;