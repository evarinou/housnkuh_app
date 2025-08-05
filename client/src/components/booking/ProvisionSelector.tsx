/**
 * @file ProvisionSelector.tsx
 * @purpose Commission model selection component for vendor onboarding with detailed benefits and rate display
 * @created 2025-01-15
 * @modified 2025-08-05
 * @complexity Medium - Business rules for commission models, visual selection interface
 */

import React from 'react';
import { Check } from 'lucide-react';

/**
 * Provision type configuration for commission models
 * @interface ProvisionType
 * @param {string} id - Unique identifier for the provision type
 * @param {string} name - Display name of the commission model
 * @param {number} rate - Commission rate as percentage (0-100)
 * @param {string} description - Detailed explanation of the commission model
 * @param {string[]} benefits - List of benefits and features included
 */
interface ProvisionType {
  id: string;
  name: string;
  rate: number;
  description: string;
  benefits: string[];
}

/**
 * Props for ProvisionSelector component
 * @interface ProvisionSelectorProps
 * @param {ProvisionType[]} provisionTypes - Available commission models to choose from
 * @param {string} selectedProvisionType - Currently selected provision type ID
 * @param {function} onProvisionTypeChange - Callback when provision selection changes
 */
interface ProvisionSelectorProps {
  provisionTypes: ProvisionType[];
  selectedProvisionType: string;
  onProvisionTypeChange: (type: string) => void;
}

/**
 * ProvisionSelector component for choosing commission models during vendor onboarding
 * 
 * Features:
 * - Visual card-based selection interface
 * - Commission rate display with percentage badges
 * - Detailed benefit listings with checkmarks
 * - Responsive grid layout (1 column mobile, 2 columns desktop)
 * - Interactive hover and selection states
 * 
 * Business Logic:
 * - Multiple commission tiers (Basic, Standard, Premium)
 * - Different benefit packages per tier
 * - Visual selection feedback with brand colors
 * 
 * @param {ProvisionSelectorProps} props - Component configuration and handlers
 * @returns {JSX.Element} Commission model selector with visual cards
 */
const ProvisionSelector: React.FC<ProvisionSelectorProps> = ({
  provisionTypes,
  selectedProvisionType,
  onProvisionTypeChange,
}) => {
  return (
    <div className="mb-10">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <span className="bg-[#e17564] text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">1</span>
        Provisionsmodell wählen
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {provisionTypes.map((type) => (
          <div
            key={type.id}
            onClick={() => onProvisionTypeChange(type.id)}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              selectedProvisionType === type.id
                ? 'border-[#e17564] bg-[#e17564]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-lg font-medium text-[#09122c]">{type.name}</h4>
              <span className="bg-[#09122c] text-white px-2 py-1 rounded text-sm font-bold">
                {type.rate}% Provision
              </span>
            </div>
            <p className="text-gray-600 mb-4">{type.description}</p>
            <ul className="space-y-2">
              {type.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <Check className="text-[#e17564] w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProvisionSelector;