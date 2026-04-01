/**
 * @file TagBadge.tsx
 * @purpose Unified tag display component — shows tag with its color and icon consistently across the app
 * @created 2026-04-01
 */

import React from 'react';

export interface TagBadgeProps {
  name: string;
  color?: string;
  icon?: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

/**
 * Convert hex color to Tailwind-compatible rgba for background
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function textColorForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? hex : hex;
}

const TagBadge: React.FC<TagBadgeProps> = ({ name, color, icon, selected, onClick, size = 'sm' }) => {
  const tagColor = color && color !== '#6B7280' ? color : '#6B7280';
  const isClickable = !!onClick;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1.5 text-sm';

  const baseStyle: React.CSSProperties = selected
    ? { backgroundColor: tagColor, color: '#fff' }
    : { backgroundColor: hexToRgba(tagColor, 0.12), color: textColorForBg(tagColor) };

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 font-medium rounded-full transition-all
        ${sizeClasses}
        ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}
        ${selected ? 'ring-2 ring-offset-1' : ''}
      `}
      style={{
        ...baseStyle,
        ...(selected ? { ringColor: tagColor } : {})
      }}
    >
      {icon && <span>{icon}</span>}
      {name}
    </span>
  );
};

export default TagBadge;
