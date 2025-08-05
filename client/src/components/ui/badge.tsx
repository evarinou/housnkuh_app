/**
 * @file badge.tsx
 * @purpose Reusable badge component for displaying small pieces of information with semantic variants
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React from 'react';

/**
 * Props interface for Badge component
 * @interface BadgeProps
 */
interface BadgeProps {
  /** Content to display inside the badge */
  children: React.ReactNode;
  /** Visual variant of the badge affecting colors and styling */
  variant?: 'default' | 'secondary';
  /** Additional CSS classes to apply to the badge */
  className?: string;
}

/**
 * Badge component for displaying small pieces of information like status, categories, or labels.
 * 
 * Features:
 * - Two visual variants: default (gray) and secondary (blue)
 * - Consistent sizing with rounded corners
 * - Inline-block display for flexible layout
 * - Small font size and semibold weight for readability
 * - Tailwind CSS styling with semantic color schemes
 * 
 * Variants:
 * - default: Gray background with dark gray text (neutral appearance)
 * - secondary: Light blue background with dark blue text (accent appearance)
 * 
 * Common use cases: Status indicators, category tags, count displays, labels
 * 
 * @component
 * @param {BadgeProps} props - Component props
 * @returns {JSX.Element} Rendered badge component
 */
export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  className = '' 
}) => {
  /** Background color class based on variant */
  let bgColor = 'bg-gray-200';
  /** Text color class based on variant */
  let textColor = 'text-gray-800';

  if (variant === 'secondary') {
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-800';
  }

  return (
    <span className={`inline-block ${bgColor} ${textColor} rounded px-2 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
};