/**
 * @file PasswordRequirementsChecklist.tsx
 * @purpose Visual password requirements checklist with real-time validation feedback
 * @created 2025-08-06
 * @modified 2025-08-06
 */
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { PASSWORD_MIN_LENGTH, PASSWORD_ERROR_MESSAGES } from '../../constants/validation';

interface PasswordRequirementsChecklistProps {
  /** The current password value to validate */
  password: string;
  /** Optional CSS classes for styling */
  className?: string;
}

interface Requirement {
  /** Whether this requirement is currently met */
  met: boolean;
  /** The text to display for this requirement */
  text: string;
  /** Unique identifier for accessibility */
  id: string;
}

/**
 * Visual checklist component that shows password requirements in real-time
 * Provides immediate feedback on which requirements are met or missing
 */
export const PasswordRequirementsChecklist: React.FC<PasswordRequirementsChecklistProps> = ({
  password,
  className = ''
}) => {
  const requirements: Requirement[] = [
    {
      met: password.length >= PASSWORD_MIN_LENGTH,
      text: PASSWORD_ERROR_MESSAGES.tooShort.replace(`Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`, `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen`),
      id: 'req-length'
    },
    {
      met: /[a-z]/.test(password),
      text: 'Mindestens ein Kleinbuchstabe',
      id: 'req-lowercase'
    },
    {
      met: /[A-Z]/.test(password),
      text: 'Mindestens ein Großbuchstabe',
      id: 'req-uppercase'
    },
    {
      met: /\d/.test(password),
      text: 'Mindestens eine Zahl',
      id: 'req-number'
    },
    {
      met: /[@$!%*?&]/.test(password),
      text: 'Mindestens ein Sonderzeichen (@$!%*?&)',
      id: 'req-special'
    }
  ];

  return (
    <div 
      className={`mt-2 space-y-1 text-sm ${className}`}
      role="list"
      aria-label="Passwort-Anforderungen"
    >
      {requirements.map((req) => (
        <div 
          key={req.id}
          className="flex items-center gap-2"
          role="listitem"
        >
          {req.met ? (
            <CheckCircle 
              className="w-4 h-4 text-green-500 flex-shrink-0" 
              aria-label="Erfüllt"
            />
          ) : (
            <XCircle 
              className="w-4 h-4 text-red-500 flex-shrink-0" 
              aria-label="Nicht erfüllt"
            />
          )}
          <span 
            className={req.met ? 'text-green-700' : 'text-gray-500'}
            id={req.id}
            aria-describedby={req.id}
          >
            {req.text}
          </span>
        </div>
      ))}
    </div>
  );
};

export default PasswordRequirementsChecklist;