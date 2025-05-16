import React, { useState } from 'react';
import { Award, Send, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface FormData {
  name: string;
  email: string;
  phone: string;
  guessedVendors: string[];
}

const VendorContest: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    guessedVendors: ['', '', '']
  });
  
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVendorGuessChange = (index: number, value: string) => {
    const newGuesses = [...formData.guessedVendors];
    newGuesses[index] = value;
    setFormData(prev => ({
      ...prev,
      guessedVendors: newGuesses
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');
    
    // Validierung: Alle Felder ausgefüllt
    if (!formData.name || !formData.email || formData.guessedVendors.some(vendor => !vendor)) {
      setStatus('error');
      setErrorMessage('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    try {
      // FormData für zuverlässigeren Datentransport
      const formDataObj = new FormData();
      
      // Name, Email, Phone hinzufügen
      formDataObj.append('name', formData.name);
      formDataObj.append('email', formData.email);
      formDataObj.append('phone', formData.phone || '');
      
      // Vermutete Vendoren als einzelne Felder
      formData.guessedVendors.forEach((vendor, index) => {
        formDataObj.append(`vendor${index+1}`, vendor);
      });
      
      // Auch als Array für PHP-Handler, die JSON verarbeiten
      formDataObj.append('guessedVendors', JSON.stringify(formData.guessedVendors));

      // Im lokalen Entwicklungsmodus
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocal) {
        // Simulieren einer erfolgreichen Antwort für Entwicklung
        setTimeout(() => {
          setStatus('success');
        }, 1000);
        return;
      }
      
      // Verwende den vereinfachten Handler
      const response = await fetch('/universal-form-handler.php?type=vendor-contest', {
        method: 'POST',
        body: formDataObj
      });
      
      // Für Debugging
      const responseText = await response.text();
      console.log('Server-Antwort:', responseText);
      
      // Versuche JSON zu parsen
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON-Parsing-Fehler:', parseError);
        throw new Error('Ungültige Antwort vom Server erhalten');
      }
      
      if (data && data.success) {
        setStatus('success');
      } else {
        throw new Error((data && data.message) || 'Ein unbekannter Fehler ist aufgetreten');
      }
    } catch (error) {
      console.error('Fehler beim Absenden:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Bei der Übermittlung ist ein Fehler aufgetreten');
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#09122c] to-[#192254] text-white rounded-lg shadow-xl p-8 mt-12 mb-16 max-w-4xl mx-auto">
      <div className="flex items-center justify-center gap-3 mb-6">
        <Award className="text-[#e17564] w-10 h-10" />
        <h2 className="text-3xl font-bold">Direktvermarkter-Wettbewerb</h2>
      </div>
      
      <div className="text-center mb-8">
        <p className="text-xl mb-3">Wer wird bei housnkuh dabei sein?</p>
        <p className="text-gray-300">
          Raten Sie, welche drei Direktvermarkter aus der Region bei der Eröffnung im Sommer 2025 
          mit ihren Produkten vertreten sein werden. Zu gewinnen gibt es einen 50€-Gutschein!
        </p>
        <p className="text-gray-300 mt-2">
          Teilnahmeschluss ist der 01.06.2025
        </p>
      </div>
      
      {status === 'success' ? (
        <div className="bg-[#e17564]/20 p-8 rounded-lg text-center animate-fadeIn">
          <CheckCircle className="w-16 h-16 text-[#e17564] mx-auto mb-4" />
          <h3 className="text-2xl font-semibold mb-3">Vielen Dank für Ihre Teilnahme!</h3>
          <p className="text-gray-300">
            Ihre Tipps wurden erfolgreich gespeichert. Der Gewinner wird nach der Eröffnung benachrichtigt.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="name">
                Name*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e17564]"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="email">
                E-Mail*
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e17564]"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="phone">
              Telefon
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e17564]"
            />
          </div>
          
          <div className="space-y-4">
            <p className="font-medium">Ihre Tipps: Welche drei Direktvermarkter werden bei housnkuh dabei sein?*</p>
            
            {[0, 1, 2].map((index) => (
              <div key={index}>
                <label className="block text-sm font-medium mb-2" htmlFor={`vendor-${index}`}>
                  Direktvermarkter {index + 1}
                </label>
                <input
                  type="text"
                  id={`vendor-${index}`}
                  value={formData.guessedVendors[index]}
                  onChange={(e) => handleVendorGuessChange(index, e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e17564]"
                  required
                />
              </div>
            ))}
          </div>
          
          <div className="text-sm text-gray-300 italic">
            * Pflichtfelder
          </div>
          
          <div className="text-center">
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="bg-[#e17564] hover:bg-[#e17564]/90 text-white font-semibold px-8 py-3 rounded-lg
                      transition-all duration-200 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {status === 'submitting' ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Wird gesendet...</span>
                </>
              ) : (
                <>
                  <span>Teilnehmen</span>
                  <Send className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
          
          {status === 'error' && (
            <div className="mt-4 bg-red-800/50 text-white p-4 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </form>
      )}
      
      <div className="mt-8 text-sm text-gray-300">
        <p className="mb-2">Teilnahmebedingungen:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Pro Person ist nur eine Teilnahme erlaubt</li>
          <li>Die Gewinner werden per E-Mail benachrichtigt</li>
          <li>Der Rechtsweg ist ausgeschlossen</li>
        </ul>
      </div>
      
      {/* Debug-Informationen - nur im lokalen Modus */}
      {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
        <div className="mt-4 p-2 bg-yellow-600/50 text-white rounded-lg text-sm">
          Lokaler Entwicklungsmodus: Daten werden simuliert
        </div>
      )}
    </div>
  );
};

export default VendorContest;