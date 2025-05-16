// client/src/components/NewsletterSignup.tsx
import React, { useState } from 'react';
import { Send, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

const NewsletterSignup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState(''); // Optional: Name für den Newsletter
  const [type, setType] = useState<'customer' | 'vendor'>('customer');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setMessage('');
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      const response = await axios.post(`${apiUrl}/newsletter/subscribe`, {
        email,
        name,
        type
      });
      
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        setEmail('');
        setName('');
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Ein Fehler ist aufgetreten.');
      }
    } catch (error) {
      setStatus('error');
      if (axios.isAxiosError(error) && error.response) {
        setMessage(error.response.data.message || 'Ein Fehler ist aufgetreten bei der Anmeldung.');
      } else {
        setMessage('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
      }
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
          {message || 'Vielen Dank für Ihre Anmeldung! Bitte bestätigen Sie Ihre E-Mail-Adresse.'}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Optional: Namensfeld */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ihr Name (optional)"
              className="px-4 py-2 rounded-lg text-gray-900 w-full sm:w-auto"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ihre E-Mail-Adresse"
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
        <div className="mt-4 p-4 bg-red-600 text-white rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
};

export default NewsletterSignup;