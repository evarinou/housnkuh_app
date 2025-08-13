/**
 * @file VendorRegistrationModal.tsx
 * @purpose Multi-step vendor registration modal with package booking integration, supporting both new user registration and existing user login
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React, { useState, useCallback, useMemo } from 'react';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX, PASSWORD_ERROR_MESSAGES } from '../constants/validation';
import { PasswordRequirementsChecklist } from './common/PasswordRequirementsChecklist';
import { X, User, Mail, Phone, Lock, Package, Eye, EyeOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { useVendorRegistration } from '../hooks/useVendorRegistration';

/**
 * Safe hook wrapper that handles missing VendorAuthContext gracefully
 * Provides all required auth methods with fallback implementations
 * @returns {object} Complete auth interface with safe fallbacks
 */
const useSafeVendorAuth = () => {
  try {
    return useVendorAuth();
  } catch {
    return { 
      isAuthenticated: false, 
      user: null,
      login: () => Promise.resolve({ success: false, message: 'Context not available' }),
      logout: () => {},
      registerWithBooking: () => Promise.resolve({ success: false, message: 'Context not available' }),
      preRegisterVendor: () => Promise.resolve({ success: false, message: 'Context not available' }),
      getTrialStatus: () => Promise.resolve({ success: false, message: 'Context not available' }),
      cancelTrialBooking: () => Promise.resolve({ success: false, message: 'Context not available' }),
      checkAuth: () => Promise.resolve(),
      isLoading: false
    };
  }
};

/**
 * Package data structure containing all selected packages, pricing, and additional services
 * Used to pass booking information from PackageBuilder to registration modal
 */
interface PackageData {
  selectedProvisionType: string;
  selectedPackages: string[];
  packageCounts: Record<string, number>;
  packageOptions: Array<{id: string, name: string, price: number, description?: string, image?: string, detail?: string}>;
  rentalDuration: number;
  totalCost: {
    monthly: number;
    oneTime: number;
    provision: number;
  };
  discount: number;
  zusatzleistungen?: {
    lagerservice: boolean;
    versandservice: boolean;
  };
}

/**
 * Props for VendorRegistrationModal component
 * @param isOpen - Controls modal visibility
 * @param onClose - Callback when modal is closed
 * @param packageData - Selected package configuration from PackageBuilder
 * @param onSuccess - Callback after successful registration/login
 */
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
  
  // Kommentare
  comments?: string;
  
  // Zustimmungen
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
}

/**
 * Multi-step vendor registration modal component with comprehensive form validation.
 * 
 * Features:
 * - 4-step registration process: Login/Register → Personal Data → Address → Summary
 * - Toggle between login and registration modes
 * - Real-time form validation with visual feedback
 * - Package data integration for booking workflow
 * - Trial period information display
 * - Secure password handling with visibility toggle
 * - Comprehensive error handling and user feedback
 * - Memoized components for performance optimization
 * 
 * Steps:
 * 1. Login/Register: Email and password authentication
 * 2. Personal Data: Name and contact information
 * 3. Address: Complete address information with PLZ validation
 * 4. Summary: Terms acceptance and final submission
 * 
 * @param props - Component props including modal state and package data
 * @returns {JSX.Element} Complete registration modal with step navigation
 */
// Password complexity regex to match backend validation


const VendorRegistrationModal: React.FC<VendorRegistrationModalProps> = React.memo(({
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
    comments: '',
    agreeToTerms: false,
    agreeToPrivacy: false
  });
  
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1); // 1: Login/Register, 2: Persönliche Daten, 3: Adresse, 4: Zusammenfassung
  const [isPreRegistration] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { login } = useSafeVendorAuth();
  const { registerWithBooking, isRegistering } = useVendorRegistration();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const type = 'type' in e.target ? e.target.type : '';
    const checked = 'checked' in e.target ? e.target.checked : false;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // PLZ Validierung für deutsche Postleitzahlen (5 Ziffern)  
  const validatePLZ = useCallback((plz: string): boolean => {
    const plzRegex = /^\d{5}$/;
    return plzRegex.test(plz);
  }, []);
  // Password complexity validation
  const validatePasswordComplexity = useCallback((password: string): {
    isValid: boolean;
    missingRequirements: string[];
  } => {
    const missingRequirements: string[] = [];
    
    if (!/[a-z]/.test(password)) {
      missingRequirements.push(PASSWORD_ERROR_MESSAGES.missingLowercase);
    }
    
    if (!/[A-Z]/.test(password)) {
      missingRequirements.push(PASSWORD_ERROR_MESSAGES.missingUppercase);
    }
    
    if (!/\d/.test(password)) {
      missingRequirements.push(PASSWORD_ERROR_MESSAGES.missingNumber);
    }
    
    if (!/[@$!%*?&]/.test(password)) {
      missingRequirements.push(PASSWORD_ERROR_MESSAGES.missingSpecialChar);
    }
    
    if (password.length < PASSWORD_MIN_LENGTH) {
      missingRequirements.push(PASSWORD_ERROR_MESSAGES.tooShort);
    }
    
    return {
      isValid: PASSWORD_REGEX.test(password) && password.length >= PASSWORD_MIN_LENGTH,
      missingRequirements
    };
  }, []);;

  const validateStep = useCallback((stepNumber: number): boolean => {
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
            validatePasswordComplexity(formData.password).isValid &&
            formData.confirmPassword.trim() !== '' &&
            formData.password === formData.confirmPassword
          );
        }
      case 2:
        return formData.name.trim() !== '';
      case 3:
        // Validate address fields
        const addressValid = (
          formData.strasse.trim() !== '' &&
          formData.hausnummer.trim() !== '' &&
          formData.plz.trim() !== '' &&
          validatePLZ(formData.plz) &&
          formData.ort.trim() !== ''
        );
        
        // Validate comments - if provided, must not be empty after trimming
        const commentsValid = !formData.comments || formData.comments.trim().length > 0;
        
        return addressValid && commentsValid;
      case 4:
        return formData.agreeToTerms && formData.agreeToPrivacy;
      default:
        return false;
    }
  }, [formData, isLogin, validateEmail, validatePLZ, validatePasswordComplexity]);

  // Memoized validation states to prevent unnecessary re-computations
  const isEmailValid = useMemo(() => 
    validateEmail(formData.email), 
    [formData.email, validateEmail]
  );

  const isPasswordValid = useMemo(() => 
    !isLogin ? validatePasswordComplexity(formData.password).isValid : formData.password !== '', 
    [formData.password, isLogin, validatePasswordComplexity]
  );

  const doPasswordsMatch = useMemo(() => 
    formData.password === formData.confirmPassword, 
    [formData.password, formData.confirmPassword]
  );

  const isPLZValid = useMemo(() => 
    validatePLZ(formData.plz), 
    [formData.plz, validatePLZ]
  );

  // Memoized step validation
  const isStepValid = useMemo(() => validateStep(step), [step, validateStep]);

  // Memoized CSS classes for form inputs to prevent unnecessary re-renders
  const emailInputClasses = useMemo(() => 
    `pl-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
      (formData.email && !isEmailValid) || fieldErrors.email
        ? 'border-red-300 bg-red-50' 
        : 'border-gray-300'
    }`, 
    [formData.email, isEmailValid, fieldErrors.email]
  );

  const passwordInputClasses = useMemo(() => 
    `pl-10 pr-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
      !isLogin && formData.password && !isPasswordValid
        ? 'border-red-300 bg-red-50'
        : 'border-gray-300'
    }`, 
    [isLogin, formData.password, isPasswordValid]
  );

  const confirmPasswordInputClasses = useMemo(() => 
    `pl-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
      formData.password && formData.confirmPassword && !doPasswordsMatch
        ? 'border-red-300 bg-red-50'
        : 'border-gray-300'
    }`, 
    [formData.password, formData.confirmPassword, doPasswordsMatch]
  );

  const handleNextStep = useCallback(() => {
    if (isStepValid) {
      setError('');
    setFieldErrors({});
      setFieldErrors({});
      setStep(step + 1);
    } else {
      // Detailliertere Fehlermeldungen je nach Schritt
      if (step === 1) {
        if (!formData.email.trim() || !isEmailValid) {
          setError('Bitte gib eine gültige E-Mail-Adresse ein');
        } else if (!isLogin && !isPasswordValid) {
          const complexityResult = validatePasswordComplexity(formData.password);
          if (complexityResult.missingRequirements.length > 0) {
            setError(`Das Passwort muss folgende Anforderungen erfüllen: ${complexityResult.missingRequirements.join(', ')}`);
          } else {
            setError('Das Passwort erfüllt nicht alle Sicherheitsanforderungen');
          }
        } else if (!isLogin && !doPasswordsMatch) {
          setError('Die Passwörter stimmen nicht überein');
        } else {
          setError('Bitte fülle alle Pflichtfelder korrekt aus');
        }
      } else if (step === 2) {
        setError('Bitte gib deinen vollständigen Namen ein');
      } else if (step === 3) {
        if (!isPLZValid) {
          setError('Bitte gib eine gültige Postleitzahl ein (5 Ziffern)');
        } else if (formData.comments && formData.comments.trim().length === 0) {
          setError('Wenn du Anmerkungen eingibst, dürfen diese nicht leer sein');
        } else {
          setError('Bitte fülle alle Adressfelder aus');
        }
      } else {
        setError('Bitte fülle alle Pflichtfelder aus');
      }
    }
  }, [step, isStepValid, formData, isLogin, isEmailValid, isPasswordValid, doPasswordsMatch, isPLZValid, validatePasswordComplexity]);

  const handlePreviousStep = useCallback(() => {
    setStep(step - 1);
    setError('');
    setFieldErrors({});
  }, [step]);

  const togglePassword = useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword]);

  const toggleLoginMode = useCallback(() => {
    setIsLogin(!isLogin);
    setError('');
    setFieldErrors({});
  }, [isLogin]);

  const handleSubmit = useCallback(async () => {
    if (!formData.agreeToTerms || !formData.agreeToPrivacy) {
      setError('Bitte stimme den Nutzungsbedingungen und der Datenschutzerklärung zu');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setFieldErrors({});

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
          // selectedAddons removed - all handled as packages now
          rentalDuration: packageData.rentalDuration,
          totalCost: {
            monthly: packageData.totalCost.monthly,
            oneTime: packageData.totalCost.oneTime || 0,
            provision: packageData.totalCost.provision || 
                     (packageData.selectedProvisionType === 'premium' ? 7 : 4)
          },
          discount: packageData.discount || 0,
          zusatzleistungen: packageData.zusatzleistungen || { lagerservice: false, versandservice: false }
        };
        
        const registrationData = {
          ...formData,
          packageData: formattedPackageData,
          comments: formData.comments?.trim() || undefined
        };
        
        const result = await registerWithBooking(registrationData);
        
        if (result.success) {
          // Erfolgreiche Registrierung - zeige Bestätigungsseite
          setShowSuccess(true);
          
          // Probemonat startet nach Eröffnung
          const trialStartMessage = `Dein 30-tägiger kostenloser Probemonat beginnt nach der Ladeneröffnung und läuft dann 30 Tage.`;
          
          setSuccessMessage(`Herzlich willkommen bei housnkuh! Deine Package-Buchung war erfolgreich. ${trialStartMessage} Du erhältst eine Bestätigungs-E-Mail an ${formData.email} mit allen Details zu deinem gebuchten Paket.`);
        } else {
          // Handle strukturierte Validierungsfehler
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
            setError(result.message || 'Bitte korrigiere die markierten Felder');
          } else {
            setFieldErrors({});
            setError(result.message || 'Ein Fehler ist aufgetreten');
          }
        }
      }
    } catch (err) {
      setError('Ein unbekannter Fehler ist aufgetreten');
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, packageData, isLogin, login, registerWithBooking, onSuccess, onClose]);

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
                  ? 'Melde dich mit deinen Zugangsdaten an' 
                  : 'Erstelle einen Account, um deine Buchung abzuschließen'
                }
              </p>
              
              {/* Trial Info Banner - Show for regular registration */}
              {!isLogin && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-green-800">
                        30 Tage kostenlos testen!
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Der Probemonat startet nach Ladeneröffnung. Innerhalb des Probemonats kannst du jederzeit kündigen.
                      </p>
                      <ul className="text-xs text-green-600 mt-2 space-y-1">
                        <li>✓ Automatische Aktivierung</li>
                        <li>✓ Voller Funktionsumfang</li>
                      </ul>
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
                  className={emailInputClasses}
                  placeholder="deine.email@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              {((formData.email && !isEmailValid) || fieldErrors.email) && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.email || 'Bitte gib eine gültige E-Mail-Adresse ein'}
                </p>
              )}
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
                  className={passwordInputClasses}
                  placeholder={isLogin ? "Dein Passwort" : "8+ Zeichen, Aa, 123, !@#"}
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!isLogin && formData.password && (
                <PasswordRequirementsChecklist 
                  password={formData.password}
                  className="mt-2"
                />
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
                    className={confirmPasswordInputClasses}
                    placeholder="Passwort wiederholen"
                    required
                    autoComplete="new-password"
                  />
                </div>
                {formData.password && formData.confirmPassword && !doPasswordsMatch && (
                  <p className="text-red-500 text-sm mt-1">Die Passwörter stimmen nicht überein</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-center pt-4">
              <button
                type="button"
                onClick={toggleLoginMode}
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
                  className={`pl-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    fieldErrors.name 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Dein vollständiger Name"
                  required
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.name}
                </p>
              )}
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
                  className={`pl-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    fieldErrors.telefon 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Deine Telefonnummer"
                />
              </div>
              {fieldErrors.telefon && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.telefon}
                </p>
              )}
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
                placeholder="Name deines Unternehmens"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-secondary mb-2">Adressdaten</h3>
              <p className="text-gray-600">Für die Rechnungsstellung benötigen wir deine Adresse</p>
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
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    fieldErrors.strasse 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Straßenname"
                  required
                />
                {fieldErrors.strasse && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.strasse}
                  </p>
                )}
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
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    fieldErrors.hausnummer 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="123"
                  required
                />
                {fieldErrors.hausnummer && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.hausnummer}
                  </p>
                )}
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
                    (formData.plz && !validatePLZ(formData.plz)) || fieldErrors.plz
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                  }`}
                  placeholder="12345"
                  required
                />
                {((formData.plz && !validatePLZ(formData.plz)) || fieldErrors.plz) && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.plz || 'Bitte gib eine gültige Postleitzahl ein (5 Ziffern)'}
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
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    fieldErrors.ort 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Deine Stadt"
                  required
                />
                {fieldErrors.ort && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.ort}
                  </p>
                )}
              </div>
            </div>

            {/* Comments Field */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="comments">
                Besondere Wünsche oder Anmerkungen (optional)
              </label>
              <textarea
                id="comments"
                name="comments"
                value={formData.comments || ''}
                onChange={handleInputChange}
                placeholder="Teile uns besondere Wünsche oder Anforderungen mit..."
                maxLength={500}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className="text-sm text-gray-500">
                  {(formData.comments || '').length}/500 Zeichen
                </span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-secondary mb-2">Buchung bestätigen</h3>
              <p className="text-gray-600">Prüfe deine Daten und bestätige die Buchung</p>
            </div>

            {/* Trial Info */}
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                30 Tage kostenloses Probeabo
              </h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>✓ Der Probemonat beginnt sofort nach Eröffnung</p>
                <p>✓ Keine Zahlungsinformationen erforderlich</p>
                <p>✓ Du kannst jederzeit kündigen</p>
                <p>✓ Nach 30 Tagen wird das gewählte Paket automatisch aktiviert</p>
              </div>
            </div>

            {/* Package-Zusammenfassung */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-secondary mb-3 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Dein gewähltes Paket (nach Probemonat)
              </h4>
              <div className="space-y-2 text-sm">
                {packageData.selectedPackages.length > 0 && (
                  <div className="flex justify-between">
                    <span>Gewählte Pakete:</span>
                    <span className="font-semibold">
                      {packageData.selectedPackages.map(pkg => {
                        const count = packageData.packageCounts[pkg] || 1;
                        const packageOption = packageData.packageOptions.find(opt => opt.id === pkg);
                        return `${count}x ${packageOption?.name || pkg}`;
                      }).join(', ')}
                    </span>
                  </div>
                )}
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
                {packageData.selectedProvisionType === 'premium' && packageData.zusatzleistungen && (packageData.zusatzleistungen.lagerservice || packageData.zusatzleistungen.versandservice) && (
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-blue-800">Zusatzleistungen:</span>
                    </div>
                    {packageData.zusatzleistungen.lagerservice && (
                      <div className="flex justify-between text-sm pl-4">
                        <span>• Lagerservice</span>
                        <span className="font-semibold">+20€/Monat</span>
                      </div>
                    )}
                    {packageData.zusatzleistungen.versandservice && (
                      <div className="flex justify-between text-sm pl-4">
                        <span>• Versandservice</span>
                        <span className="font-semibold">+5€/Monat</span>
                      </div>
                    )}
                  </div>
                )}
                {packageData.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Laufzeitrabatt:</span>
                    <span className="font-semibold">-{(packageData.discount * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Comments Display */}
            {formData.comments && formData.comments.trim() && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Deine Anmerkungen:</h4>
                <p className="text-sm text-blue-700 whitespace-pre-wrap">{formData.comments.trim()}</p>
              </div>
            )}

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
                    <li>Du erhältst eine Bestätigungs-E-Mail</li>
                    <li>Wir nehmen in 2 Werktagen Kontakt mit dir auf</li>
                    <li>Gemeinsam besprechen wir die finalen Details</li>
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
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-red-700 font-medium">{error}</span>
                  {Object.keys(fieldErrors).length > 0 && (
                    <div className="mt-2">
                      <ul className="text-sm text-red-600 space-y-1">
                        {Object.entries(fieldErrors).map(([field, message]) => {
                          const fieldLabels: Record<string, string> = {
                            name: 'Name',
                            email: 'E-Mail',
                            telefon: 'Telefonnummer',
                            strasse: 'Straße',
                            hausnummer: 'Hausnummer', 
                            plz: 'Postleitzahl',
                            ort: 'Ort',
                            unternehmen: 'Unternehmen'
                          };
                          const fieldLabel = fieldLabels[field] || field;
                          
                          return (
                            <li key={field} className="flex items-start">
                              <span className="font-medium mr-2">•</span>
                              <span className="font-medium">{fieldLabel}:</span>
                              <span className="ml-1">{message}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
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
            disabled={!validateStep(step) || isSubmitting || isRegistering}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                     flex items-center gap-2"
          >
            {(isSubmitting || isRegistering) && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {step < 4 ? 'Weiter' : (isLogin ? 'Anmelden' : 'Buchung bestätigen')}
          </button>
        </div>
      </div>
    </div>
  );
});

VendorRegistrationModal.displayName = 'VendorRegistrationModal';

export default VendorRegistrationModal;