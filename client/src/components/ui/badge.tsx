// src/components/ui/badge.tsx
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  className = '' 
}) => {
  let bgColor = 'bg-gray-200';
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