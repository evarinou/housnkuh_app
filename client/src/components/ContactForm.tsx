import React, { useState } from 'react';
import axios from 'axios';

interface ContactFormProps {
  className?: string;
}

const ContactForm: React.FC<ContactFormProps> = ({ className }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  
  const [formStatus, setFormStatus] = useState<{
    submitted: boolean;
    success: boolean | null;
    message: string;
  }>({
    submitted: false,
    success: null,
    message: ''
  });
  
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    subject?: string;
    message?: string;
  }>({});
  
  const [loading, setLoading] = useState(false);
  
  const validateForm = () => {
    const newErrors: any = {};
    
    // Name validieren
    if (!formData.name.trim()) {
      newErrors.name = 'Bitte geben Sie Ihren Namen ein';
    }
    
    // Email validieren
    if (!formData.email.trim()) {
      newErrors.email = 'Bitte geben Sie Ihre E-Mail-Adresse ein';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }
    
    // Telefon validieren (optional)
    if (formData.phone && !/^[0-9\s\-+()]{6,20}$/.test(formData.phone)) {
      newErrors.phone = 'Bitte geben Sie eine gültige Telefonnummer ein';
    }
    
    // Betreff validieren
    if (!formData.subject.trim()) {
      newErrors.subject = 'Bitte geben Sie einen Betreff ein';
    }
    
    // Nachricht validieren
    if (!formData.message.trim()) {
      newErrors.message = 'Bitte geben Sie Ihre Nachricht ein';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await axios.post(`${apiUrl}/contact`, formData);
      
      setFormStatus({
        submitted: true,
        success: true,
        message: response.data.message || 'Vielen Dank für Ihre Nachricht! Wir werden uns in Kürze bei Ihnen melden.'
      });
      
      // Formular zurücksetzen
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Fehler beim Senden des Kontaktformulars:', error);
      
      let errorMessage = 'Beim Senden Ihrer Nachricht ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.';
      
      if (axios.isAxiosError(error) && error.response) {
        // Server-Fehler verwenden, falls vorhanden
        errorMessage = error.response.data.message || errorMessage;
        
        // Validierungsfehler vom Server
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join('. ');
        }
      }
      
      setFormStatus({
        submitted: true,
        success: false,
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`${className} bg-white p-6 rounded-lg shadow-md`}>
      <h2 className="text-2xl font-bold text-primary-900 mb-4">Kontaktieren Sie uns</h2>
      
      {formStatus.submitted && formStatus.success === true && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{formStatus.message}</p>
            </div>
          </div>
        </div>
      )}
      
      {formStatus.submitted && formStatus.success === false && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{formStatus.message}</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ihr Name"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            E-Mail <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ihre E-Mail-Adresse"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Telefon <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ihre Telefonnummer"
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Betreff <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Betreff Ihrer Anfrage"
          />
          {errors.subject && (
            <p className="mt-1 text-xs text-red-500">{errors.subject}</p>
          )}
        </div>
        
        <div className="mb-6">
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Nachricht <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={5}
            className={`w-full p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.message ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ihre Nachricht an uns"
          />
          {errors.message && (
            <p className="mt-1 text-xs text-red-500">{errors.message}</p>
          )}
        </div>
        
        <div className="text-center">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wird gesendet...
              </span>
            ) : 'Nachricht senden'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactForm;