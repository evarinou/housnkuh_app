/**
 * @file NewsletterSignup.tsx
 * @purpose Newsletter subscription component with customer/vendor type selection, validation, and API integration
 * @created 2025-01-15
 * @modified 2025-08-22
 */
import React, { useState } from 'react';
import { Send, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

/**
 * Newsletter subscription component with type selection and comprehensive status handling.
 * 
 * Features:
 * - Email and name collection with validation
 * - Customer/vendor type selection for targeted newsletters
 * - Form submission with loading states
 * - Success/error message display with visual feedback
 * - Debug information display for development
 * - Email format validation
 * - API integration with newsletter service
 * - Responsive design with accessibility features
 * - Modern glassmorphism design with floating labels
 * - Toggle switch for type selection
 * - Smooth animations and micro-interactions
 * 
 * @returns {JSX.Element} Newsletter signup form with modern design and status feedback
 */
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
    <div className="relative overflow-hidden">
      {/* Main content */}
      <div className="relative z-10 text-center">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white">
            Bleib informiert!
          </h2>
          <p className="text-lg text-white/90 leading-relaxed max-w-md mx-auto">
            Melde Dich für den Newsletter an und erfahre als Erste/r von der Eröffnung.
          </p>
        </div>
        
        {status === 'success' ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="relative">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg animate-pulse">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <div className="absolute inset-0 w-16 h-16 bg-green-400 rounded-full animate-ping opacity-30"></div>
            </div>
            <p className="text-xl font-semibold text-white">
              {message || 'Vielen Dank für deine Anmeldung! Bitte bestätige deine E-Mail-Adresse.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div className="relative group">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=" "
                className="w-full px-4 pt-6 pb-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300 peer"
                id="name"
              />
              <label 
                htmlFor="name"
                className="absolute left-4 top-2 text-sm text-white/70 transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-white/50 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-sm peer-focus:text-white/70"
              >
                Dein Name (optional)
              </label>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
            
            {/* Email Input */}
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className="w-full px-4 pt-6 pb-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300 peer"
                id="email"
                required
              />
              <label 
                htmlFor="email"
                className="absolute left-4 top-2 text-sm text-white/70 transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-white/50 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-sm peer-focus:text-white/70"
              >
                Deine E-Mail-Adresse *
              </label>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
            
            {/* Type Toggle Switch */}
            <div className="flex flex-col items-center space-y-4">
              <p className="text-white/80 text-sm font-medium">Ich bin...</p>
              <div className="relative bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20 inline-flex">
                <div className={`absolute top-1 bottom-1 bg-white/20 rounded-full transition-all duration-300 ease-in-out ${
                  type === 'vendor' 
                    ? 'left-[calc(50%+2px)] right-1' 
                    : 'left-1 right-[calc(50%+2px)]'
                }`}></div>
                <div className="relative flex">
                  <button
                    type="button"
                    onClick={() => setType('customer')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-colors duration-300 z-10 ${
                      type === 'customer' ? 'text-white' : 'text-white/60'
                    }`}
                  >
                    Kunde
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('vendor')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-colors duration-300 z-10 ${
                      type === 'vendor' ? 'text-white' : 'text-white/60'
                    }`}
                  >
                    Direktvermarkter
                  </button>
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="pt-4">
              <button 
                type="submit"
                disabled={status === 'submitting'}
                className="group relative w-full sm:w-auto mx-auto px-8 py-4 bg-white/20 backdrop-blur-md hover:bg-white/30 border border-white/30 hover:border-white/50 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="relative z-10 flex items-center justify-center space-x-2">
                  {status === 'submitting' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Wird angemeldet...</span>
                    </>
                  ) : (
                    <>
                      <span>Anmelden</span>
                      <Send size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </form>
        )}
        
        {status === 'error' && (
          <div className="mt-6 p-6 bg-red-500/20 backdrop-blur-md border border-red-300/30 rounded-xl">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-medium">{message}</span>
            </div>
            {debugInfo && process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-white/70 hover:text-white transition-colors">
                  Debug-Informationen anzeigen
                </summary>
                <pre className="text-xs bg-red-900/30 backdrop-blur-sm p-3 rounded-lg mt-3 text-left whitespace-pre-wrap text-white/80 border border-red-400/20">
                  {debugInfo}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsletterSignup;