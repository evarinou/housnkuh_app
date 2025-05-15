// client/src/components/NewsletterSignup.tsx
import React, { useState } from 'react';
import { Send, Check } from 'lucide-react';

const NewsletterSignup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'customer' | 'vendor'>('customer'); // 'customer' oder 'vendor'
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle'); // idle, submitting, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');
    
    try {
      // Im lokalen Entwicklungsmodus simulieren wir einfach den Erfolg
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Simulierte Antwort für lokale Entwicklung
        setTimeout(() => {
          setStatus('success');
          setEmail('');
        }, 1000);
        return;
      }
      
      // Auf dem Server: FormData verwenden für bessere Kompatibilität
      const formData = new FormData();
      formData.append('email', email);
      formData.append('type', type);
      
      // Da der bestehende newsletter.php funktioniert, verwenden wir ihn weiterhin
      const response = await fetch('./newsletter.php', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
        setErrorMessage(data.message || 'Ein Fehler ist aufgetreten.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
      console.error('Newsletter error:', error);
    }
  };

  return (
    <div className="bg-secondary text-white rounded-lg p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Bleiben Sie informiert!</h2>
      <p className="mb-6">
        Melden Sie sich für den Newsletter an und erfahren Sie als Erste/r von der Eröffnung.
      </p>
      
      {status === 'success' ? (
        <div className="flex items-center justify-center text-lg">
          <Check className="mr-2" />
          Vielen Dank für Ihre Anmeldung!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ihre E-Mail-Adresse"
            className="px-4 py-2 rounded-lg text-gray-900 w-full sm:w-auto"
            required
          />
          
          <div className="flex items-center gap-4 text-white">
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
        </form>
      )}
      
      {status === 'error' && (
        <div className="mt-4 p-4 bg-red-600 text-white rounded-lg">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default NewsletterSignup;