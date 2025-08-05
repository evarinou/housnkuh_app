/**
 * @file sanitization.ts
 * @purpose Comprehensive input sanitization and validation utilities for XSS prevention and data security
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import DOMPurify from 'dompurify';

/**
 * DOMPurify configuration for HTML sanitization
 * @description Defines allowed tags, attributes, and security rules for HTML content
 * @constant
 */
const purifyConfig = {
  /** Safe HTML tags allowed in content */
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'div', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img'
  ],
  /** Safe HTML attributes allowed on elements */
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id'
  ],
  /** Regex pattern for allowed URI schemes */
  ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp):\/\/|mailto:|tel:)/i,
  /** Explicitly forbidden tags for security */
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  /** Explicitly forbidden attributes for security */
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  /** Keep text content when removing forbidden tags */
  KEEP_CONTENT: true,
  /** Return string instead of DOM */
  RETURN_DOM: false,
  /** Return string instead of DOM fragment */
  RETURN_DOM_FRAGMENT: false,
  /** Don't use trusted types */
  RETURN_TRUSTED_TYPE: false
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * @description Multi-layer sanitization: pre-processing to remove dangerous patterns,
 * then DOMPurify with strict configuration. Removes scripts, event handlers, and
 * dangerous URI schemes while preserving safe HTML formatting.
 * 
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML safe for display
 */
export const sanitizeHtml = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // Pre-process to handle edge cases
  let cleanedHtml = html
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/expression\s*\(/gi, '');
  
  return DOMPurify.sanitize(cleanedHtml, purifyConfig);
};

/**
 * Sanitize plain text by removing all HTML tags
 * 
 * @description Strips all HTML tags and attributes from input text.
 * Used for user input that should be displayed as plain text only.
 * 
 * @param {string} text - Text content to sanitize
 * @returns {string} Plain text with all HTML removed
 */
export const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

/**
 * Sanitize URL to prevent malicious protocols
 * 
 * @description Removes dangerous protocols (javascript:, data:, vbscript:)
 * and validates that URLs use safe protocols (http, https, mailto, tel).
 * Also allows relative URLs starting with '/'.
 * 
 * @param {string} url - URL to sanitize
 * @returns {string} Safe URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  // Remove javascript: and data: protocols
  const cleanUrl = url.replace(/^(javascript|data|vbscript):/i, '');
  
  // Allow only http, https, mailto, and tel protocols
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(cleanUrl) && !cleanUrl.startsWith('/')) {
    return '';
  }
  
  return cleanUrl;
};

/**
 * Recursively sanitize object properties for API requests
 * 
 * @description Deep sanitization of objects and arrays. Sanitizes all string values
 * using sanitizeText while preserving object structure. Handles nested objects
 * and arrays recursively. Non-string values pass through unchanged.
 * 
 * @param {any} obj - Object to sanitize recursively
 * @returns {any} Sanitized object with safe string values
 */
export const sanitizeObject = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') {
        return sanitizeText(item);
      } else if (typeof item === 'object' && item !== null) {
        return sanitizeObject(item);
      }
      return item;
    });
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Apply text sanitization to string values
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Validate email format
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number format
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{6,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Escape HTML entities
export const escapeHtml = (unsafe: string): string => {
  if (!unsafe || typeof unsafe !== 'string') {
    return '';
  }
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Unescape HTML entities
export const unescapeHtml = (safe: string): string => {
  if (!safe || typeof safe !== 'string') {
    return '';
  }
  
  return safe
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

// Safe innerHTML replacement
export const safeInnerHTML = (element: HTMLElement, content: string): void => {
  if (!element || !content) {
    return;
  }
  
  const sanitizedContent = sanitizeHtml(content);
  element.innerHTML = sanitizedContent;
};

// Create safe HTML element
export const createSafeElement = (tagName: string, content?: string, attributes?: Record<string, string>): HTMLElement => {
  const element = document.createElement(tagName);
  
  if (content) {
    element.textContent = content; // Use textContent instead of innerHTML for safety
  }
  
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (key.startsWith('on')) {
        // Don't allow event handlers
        continue;
      }
      
      if (key === 'href' || key === 'src') {
        element.setAttribute(key, sanitizeUrl(value));
      } else {
        element.setAttribute(key, sanitizeText(value));
      }
    }
  }
  
  return element;
};

// React-specific utilities
export const createSafeProps = (props: Record<string, any>): Record<string, any> => {
  const safeProps: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on') && typeof value === 'string') {
      // Don't allow string event handlers
      continue;
    }
    
    if (key === 'dangerouslySetInnerHTML') {
      // Always sanitize dangerouslySetInnerHTML
      if (value && value.__html) {
        safeProps[key] = {
          __html: sanitizeHtml(value.__html)
        };
      }
    } else if (typeof value === 'string') {
      safeProps[key] = sanitizeText(value);
    } else {
      safeProps[key] = value;
    }
  }
  
  return safeProps;
};

// Hook for safe HTML content in React
export const useSafeHtml = (htmlContent: string): string => {
  return sanitizeHtml(htmlContent);
};

export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeObject,
  validateEmail,
  validatePhone,
  escapeHtml,
  unescapeHtml,
  safeInnerHTML,
  createSafeElement,
  createSafeProps,
  useSafeHtml
};