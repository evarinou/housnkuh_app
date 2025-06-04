// client/src/components/VendorRegistrationModal.tsx
import React, { useState } from 'react';
import { X, User, Mail, Phone, Lock, Package, Eye, EyeOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { useStoreSettings } from '../contexts/StoreSettingsContext';

interface PackageData {
  selectedProvisionType: string;
  selectedPackages: string[];
  packageCounts: Record<string, number>;
  packageOptions: Array<{id: string, name: string, price: number, description?: string, image?: string, detail?: string}>;
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
  const [isPreRegistration, setIsPreRegistration] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { login, registerWithBooking, preRegisterVendor } = useVendorAuth();
  const { settings: storeSettings } = useStoreSettings();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // PLZ Validierung für deutsche Postleitzahlen (5 Ziffern)  
  const validatePLZ = (plz: string): boolean => {
    const plzRegex = /^\d{5}$/;
    return plzRegex.test(plz);
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (isLogin) {
          return formData.email !== '' && 
                 validateEmail(formData.email) && 
                 formData.password !== '';
        } else {
          return (
            formData.email.trim() !== '' &&
            validateEmail(formData.email) &&
            formData.password.trim() !== '' &&
            formData.password.length >= 6 && // Mindestlänge für sicheres Passwort
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
          validatePLZ(formData.plz) &&
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
      // Detailliertere Fehlermeldungen je nach Schritt
      if (step === 1) {
        if (!formData.email.trim() || !validateEmail(formData.email)) {
          setError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
        } else if (!isLogin && formData.password.length < 6) {
          setError('Das Passwort muss mindestens 6 Zeichen lang sein');
        } else if (!isLogin && formData.password !== formData.confirmPassword) {
          setError('Die Passwörter stimmen nicht überein');
        } else {
          setError('Bitte füllen Sie alle Pflichtfelder korrekt aus');
        }
      } else if (step === 2) {
        setError('Bitte geben Sie Ihren vollständigen Namen ein');
      } else if (step === 3) {
        if (!validatePLZ(formData.plz)) {
          setError('Bitte geben Sie eine gültige Postleitzahl ein (5 Ziffern)');
        } else {
          setError('Bitte füllen Sie alle Adressfelder aus');
        }
      } else {
        setError('Bitte füllen Sie alle Pflichtfelder aus');
      }
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
        // Immer normale Package-Registrierung verwenden (egal ob Store offen oder nicht)
        // Package Data für Server formatieren
        const formattedPackageData = {
          selectedProvisionType: packageData.selectedProvisionType,
          packageCounts: packageData.packageCounts || {},
          packageOptions: packageData.packageOptions ? packageData.packageOptions.map(opt => ({
            id: opt.id,
            name: opt.name,
            price: opt.price
          })) : [],
          selectedAddons: packageData.selectedAddons || [],
          rentalDuration: packageData.rentalDuration,
          totalCost: {
            monthly: packageData.totalCost.monthly,
            provision: packageData.totalCost.provision || 
                     (packageData.selectedProvisionType === 'premium' ? 7 : 4)
          }
        };
        
        const registrationData = {
          ...formData,
          packageData: formattedPackageData
        };
        
        const result = await registerWithBooking(registrationData);
        
        if (result.success) {
          // Erfolgreiche Registrierung - zeige Bestätigungsseite
          setShowSuccess(true);
          
          // Probemonat Start-Datum abhängig von Store Status
          const isStoreOpen = storeSettings?.isStoreOpen ?? true;
          let trialStartMessage = '';
          
          if (isStoreOpen) {
            // Store ist offen - Probemonat startet sofort
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 30);
            trialStartMessage = `Ihr 30-tägiger kostenloser Probemonat hat begonnen und läuft bis zum ${trialEndDate.toLocaleDateString('de-DE')}.`;
          } else {
            // Store ist noch nicht offen - Probemonat startet bei Eröffnung
            const openingDate = storeSettings?.openingDate ? new Date(storeSettings.openingDate) : null;
            if (openingDate) {
              const trialEndDate = new Date(openingDate);
              trialEndDate.setDate(trialEndDate.getDate() + 30);
              trialStartMessage = `Ihr 30-tägiger kostenloser Probemonat startet automatisch mit der Store-Eröffnung am ${openingDate.toLocaleDateString('de-DE')} und läuft bis zum ${trialEndDate.toLocaleDateString('de-DE')}.`;
            } else {
              trialStartMessage = `Ihr 30-tägiger kostenloser Probemonat startet automatisch mit der Store-Eröffnung.`;
            }
          }
          
          setSuccessMessage(`Herzlich willkommen bei housnkuh! Ihre Package-Buchung war erfolgreich. ${trialStartMessage} Sie erhalten eine Bestätigungs-E-Mail an ${formData.email} mit allen Details zu Ihrem gebuchten Paket.`);
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
              
              {/* Trial Info Banner - Show for regular registration */}
              {!isLogin && (!storeSettings || storeSettings.isStoreOpen) && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-green-800">
                        30 Tage kostenlos testen!
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Ihr Probemonat startet sofort nach der Registrierung. Sie können jederzeit kündigen.
                      </p>
                      <ul className="text-xs text-green-600 mt-2 space-y-1">
                        <li>✓ Keine Kreditkarte erforderlich</li>
                        <li>✓ Automatische Aktivierung</li>
                        <li>✓ Voller Funktionsumfang</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Pre-Registration Info Banner */}
              {!isLogin && storeSettings && !storeSettings.isStoreOpen && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-blue-800">
                        Vor-Registrierung vor Store-Eröffnung
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Ihr kostenloser Probemonat startet automatisch mit der Store-Eröffnung
                        {storeSettings.openingDate && (
                          <span className="font-medium">
                            {' '}am {new Date(storeSettings.openingDate).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                  className={`pl-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent
                    ${formData.email && !validateEmail(formData.email) 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'}`}
                  placeholder="ihre.email@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              {formData.email && !validateEmail(formData.email) && (
                <p className="mt-1 text-sm text-red-600">
                  Bitte geben Sie eine gültige E-Mail-Adresse ein
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Wenn Sie bereits im Newsletter angemeldet sind, können Sie dieselbe E-Mail-Adresse verwenden.
              </p>
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
                  className={`pl-10 pr-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent
                    ${!isLogin && formData.password && formData.password.length < 6
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'}`}
                  placeholder={isLogin ? "Ihr Passwort" : "Mind. 6 Zeichen"}
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!isLogin && formData.password && formData.password.length < 6 && (
                <p className="mt-1 text-sm text-red-600">
                  Das Passwort muss mindestens 6 Zeichen lang sein
                </p>
              )}
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
                    className={`pl-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent
                      ${formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'}`}
                    placeholder="Passwort wiederholen"
                    required
                    autoComplete="new-password"
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
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    formData.plz && !validatePLZ(formData.plz) 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                  }`}
                  placeholder="12345"
                  required
                />
                {formData.plz && !validatePLZ(formData.plz) && (
                  <p className="mt-1 text-sm text-red-600">
                    Bitte geben Sie eine gültige Postleitzahl ein (5 Ziffern)
                  </p>
                )}
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

            {/* Trial Info */}
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                30 Tage kostenloses Probeabo
              </h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>✓ Ihr Probemonat beginnt sofort nach der Registrierung</p>
                <p>✓ Keine Zahlungsinformationen erforderlich</p>
                <p>✓ Sie können jederzeit kündigen</p>
                <p>✓ Nach 30 Tagen wird Ihr gewähltes Paket automatisch aktiviert</p>
              </div>
            </div>

            {/* Package-Zusammenfassung */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-secondary mb-3 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Ihr gewähltes Paket (nach Probemonat)
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

  // Success Screen
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-secondary">
                {isPreRegistration ? 'Vor-Registrierung erfolgreich!' : 'Registrierung erfolgreich!'}
              </h2>
            </div>
            <button
              onClick={() => {
                setShowSuccess(false);
                onSuccess();
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Success Content */}
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <p className="text-gray-700 mb-6 leading-relaxed">
              {successMessage}
            </p>
            
            {!isPreRegistration && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-green-800">Ihre Probezeit-Vorteile:</p>
                    <ul className="text-xs text-green-600 mt-2 space-y-1">
                      <li>• 30 Tage kostenloses Testen</li>
                      <li>• Zugang zu allen Funktionen</li>
                      <li>• Jederzeitige Kündigung möglich</li>
                      <li>• Automatische E-Mail-Erinnerung vor Ablauf</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {isPreRegistration && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-2">
                  <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-800">Was passiert als nächstes?</p>
                    <ul className="text-xs text-blue-600 mt-2 space-y-1">
                      <li>• Sie erhalten eine Bestätigungs-E-Mail</li>
                      <li>• Wir informieren Sie über die Store-Eröffnung</li>
                      <li>• Ihr kostenloser Probemonat startet automatisch</li>
                      <li>• Sie können sofort nach Eröffnung verkaufen</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={() => {
                setShowSuccess(false);
                onSuccess();
                onClose();
              }}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Verstanden
            </button>
          </div>
        </div>
      </div>
    );
  }

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