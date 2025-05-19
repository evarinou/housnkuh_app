// client/src/components/VendorRegistrationModal.tsx
import React, { useState } from 'react';
import { X, User, Mail, Phone, Lock, Package, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useVendorAuth } from '../contexts/VendorAuthContext';

interface PackageData {
  selectedProvisionType: string;
  selectedPackages: string[];
  selectedAddons: string[];
  rentalDuration: number;
  totalCost: {
    monthly: number;
    oneTime: number;
    provision: number;
  };
}

interface VendorRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageData: PackageData;
  onSuccess: () => void;
}

interface FormData {
  // Login-Daten
  email: string;
  password: string;
  confirmPassword: string;
  
  // Persönliche Daten
  name: string;
  telefon: string;
  unternehmen: string;
  
  // Adressdaten
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  
  // Zustimmungen
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
}

const VendorRegistrationModal: React.FC<VendorRegistrationModalProps> = ({
  isOpen,
  onClose,
  packageData,
  onSuccess
}) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    telefon: '',
    unternehmen: '',
    strasse: '',
    hausnummer: '',
    plz: '',
    ort: '',
    agreeToTerms: false,
    agreeToPrivacy: false
  });
  
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Login/Register, 2: Persönliche Daten, 3: Adresse, 4: Zusammenfassung
  
  const { login, registerWithBooking } = useVendorAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (isLogin) {
          return formData.email !== '' && formData.password !== '';
        } else {
          return (
            formData.email.trim() !== '' &&
            formData.password.trim() !== '' &&
            formData.confirmPassword.trim() !== '' &&
            formData.password === formData.confirmPassword
          );
        }
      case 2:
        return formData.name.trim() !== '';
      case 3:
        return (
          formData.strasse.trim() !== '' &&
          formData.hausnummer.trim() !== '' &&
          formData.plz.trim() !== '' &&
          formData.ort.trim() !== ''
        );
      case 4:
        return formData.agreeToTerms && formData.agreeToPrivacy;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setError('');
      setStep(step + 1);
    } else {
      setError('Bitte füllen Sie alle Pflichtfelder aus');
    }
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      setError('Bitte stimmen Sie den Nutzungsbedingungen und der Datenschutzerklärung zu');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isLogin) {
        // Login-Logik
        const success = await login(formData.email, formData.password);
        if (success) {
          onSuccess();
          onClose();
        } else {
          setError('Ungültige Anmeldedaten');
        }
      } else {
        // Registrierung mit Buchung
        const registrationData = {
          ...formData,
          packageData
        };
        
        const result = await registerWithBooking(registrationData);
        
        if (result.success) {
          // Erfolgreiche Registrierung - zeige Bestätigungsseite
          onSuccess();
          onClose();
        } else {
          setError(result.message || 'Ein Fehler ist aufgetreten');
        }
      }
    } catch (err) {
      setError('Ein unbekannter Fehler ist aufgetreten');
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-secondary mb-2">
                {isLogin ? 'Anmelden' : 'Account erstellen'}
              </h3>
              <p className="text-gray-600">
                {isLogin 
                  ? 'Melden Sie sich mit Ihren Zugangsdaten an' 
                  : 'Erstellen Sie einen Account, um Ihre Buchung abzuschließen'
                }
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                E-Mail-Adresse *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="ihre.email@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                Passwort *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ihr Passwort"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="confirmPassword">
                  Passwort bestätigen *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Passwort wiederholen"
                    required
                  />
                </div>
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">Die Passwörter stimmen nicht überein</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-center pt-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary/80 font-medium"
              >
                {isLogin 
                  ? 'Noch kein Account? Hier registrieren' 
                  : 'Bereits registriert? Hier anmelden'
                }
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-secondary mb-2">Persönliche Daten</h3>
              <p className="text-gray-600">Bitte geben Sie Ihre persönlichen Daten ein</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                Vollständiger Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ihr vollständiger Name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="telefon">
                Telefonnummer
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  id="telefon"
                  name="telefon"
                  value={formData.telefon}
                  onChange={handleInputChange}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ihre Telefonnummer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="unternehmen">
                Unternehmen/Betrieb
              </label>
              <input
                type="text"
                id="unternehmen"
                name="unternehmen"
                value={formData.unternehmen}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Name Ihres Unternehmens (optional)"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-secondary mb-2">Adressdaten</h3>
              <p className="text-gray-600">Für die Rechnungsstellung benötigen wir Ihre Adresse</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="strasse">
                  Straße *
                </label>
                <input
                  type="text"
                  id="strasse"
                  name="strasse"
                  value={formData.strasse}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Straßenname"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="hausnummer">
                  Nr. *
                </label>
                <input
                  type="text"
                  id="hausnummer"
                  name="hausnummer"
                  value={formData.hausnummer}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="123"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="plz">
                  PLZ *
                </label>
                <input
                  type="text"
                  id="plz"
                  name="plz"
                  value={formData.plz}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="12345"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="ort">
                  Ort *
                </label>
                <input
                  type="text"
                  id="ort"
                  name="ort"
                  value={formData.ort}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ihre Stadt"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-secondary mb-2">Buchung bestätigen</h3>
              <p className="text-gray-600">Prüfen Sie Ihre Daten und bestätigen Sie die Buchung</p>
            </div>

            {/* Package-Zusammenfassung */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-secondary mb-3 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Ihr gewähltes Paket
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Monatliche Kosten:</span>
                  <span className="font-semibold">{packageData.totalCost.monthly.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span>Provision:</span>
                  <span className="font-semibold">{packageData.totalCost.provision}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Laufzeit:</span>
                  <span className="font-semibold">{packageData.rentalDuration} Monate</span>
                </div>
              </div>
            </div>

            {/* Zustimmungen */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  required
                />
                <span className="text-sm text-gray-700">
                  Ich stimme den{' '}
                  <a href="/agb" target="_blank" className="text-primary hover:underline">
                    Allgemeinen Geschäftsbedingungen
                  </a>{' '}
                  zu. *
                </span>
              </label>

              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="agreeToPrivacy"
                  checked={formData.agreeToPrivacy}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  required
                />
                <span className="text-sm text-gray-700">
                  Ich stimme der{' '}
                  <a href="/datenschutz" target="_blank" className="text-primary hover:underline">
                    Datenschutzerklärung
                  </a>{' '}
                  zu. *
                </span>
              </label>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <strong>Was passiert nach der Bestätigung?</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Sie erhalten eine Bestätigungs-E-Mail</li>
                    <li>Wir nehmen in 2 Werktagen Kontakt mit Ihnen auf</li>
                    <li>Gemeinsam besprechen wir die finalen Details</li>
                    <li>Der Vertrag wird erstellt und Sie können starten</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-secondary">
              {isLogin ? 'Anmelden' : 'Paket buchen'}
            </h2>
            <p className="text-gray-600 mt-1">Schritt {step} von 4</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= stepNumber
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div
                    className={`flex-1 h-2 mx-2 rounded ${
                      step > stepNumber ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStep()}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t bg-gray-50">
          <button
            onClick={step > 1 ? handlePreviousStep : onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            disabled={isSubmitting}
          >
            {step > 1 ? 'Zurück' : 'Abbrechen'}
          </button>

          <button
            onClick={step < 4 ? handleNextStep : handleSubmit}
            disabled={!validateStep(step) || isSubmitting}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                     flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {step < 4 ? 'Weiter' : (isLogin ? 'Anmelden' : 'Buchung bestätigen')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorRegistrationModal;