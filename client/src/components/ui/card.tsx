/**
 * @file card.tsx
 * @purpose Reusable card UI components with semantic structure for content organization
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React from 'react';

/**
 * Props interface for main Card component
 * @interface CardProps
 */
interface CardProps {
  /** Child elements to render inside the card */
  children: React.ReactNode;
  /** Additional CSS classes to apply to the card */
  className?: string;
}

/**
 * Main card component that provides a white container with shadow and rounded corners.
 * Forms the base container for card-based layouts.
 * 
 * Default styling: white background, rounded corners, shadow, padding
 * 
 * @component
 * @param {CardProps} props - Component props
 * @returns {JSX.Element} Rendered card container
 */
export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '' 
}) => {
  return <div className={`bg-white rounded shadow p-4 ${className}`}>{children}</div>;
};

/**
 * Props interface for CardHeader component
 * @interface CardHeaderProps
 */
interface CardHeaderProps {
  /** Child elements to render inside the card header */
  children: React.ReactNode;
  /** Additional CSS classes to apply to the header */
  className?: string;
}

/**
 * Card header component that provides a visually separated top section of a card.
 * Typically contains titles, actions, or navigation elements.
 * 
 * Default styling: bottom border, bottom padding, bottom margin for separation
 * 
 * @component
 * @param {CardHeaderProps} props - Component props
 * @returns {JSX.Element} Rendered card header section
 */
export const CardHeader: React.FC<CardHeaderProps> = ({ 
  children, 
  className = '' 
}) => {
  return <div className={`border-b pb-2 mb-2 ${className}`}>{children}</div>;
};

/**
 * Props interface for CardTitle component
 * @interface CardTitleProps
 */
interface CardTitleProps {
  /** Child elements to render as the card title */
  children: React.ReactNode;
  /** Additional CSS classes to apply to the title */
  className?: string;
}

/**
 * Card title component that provides consistent heading styling for card headers.
 * Typically used within CardHeader for semantic title display.
 * 
 * Default styling: large font size (text-lg), bold weight
 * Renders as h3 element for semantic HTML structure
 * 
 * @component
 * @param {CardTitleProps} props - Component props
 * @returns {JSX.Element} Rendered card title heading
 */
export const CardTitle: React.FC<CardTitleProps> = ({ 
  children, 
  className = '' 
}) => {
  return <h3 className={`text-lg font-bold ${className}`}>{children}</h3>;
};

/**
 * Props interface for CardContent component
 * @interface CardContentProps
 */
interface CardContentProps {
  /** Child elements to render inside the card content area */
  children: React.ReactNode;
  /** Additional CSS classes to apply to the content area */
  className?: string;
}

/**
 * Card content component that provides the main content area of a card.
 * Minimal default styling allows maximum flexibility for content layout.
 * 
 * Default styling: none (relies on className for custom styling)
 * 
 * @component
 * @param {CardContentProps} props - Component props
 * @returns {JSX.Element} Rendered card content area
 */
export const CardContent: React.FC<CardContentProps> = ({ 
  children, 
  className = '' 
}) => {
  return <div className={className}>{children}</div>;
};