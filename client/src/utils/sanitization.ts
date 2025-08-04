import DOMPurify from 'dompurify';

// DOMPurify configuration
const purifyConfig = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'div', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp):\/\/|mailto:|tel:)/i,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false
};

// Sanitize HTML content
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

// Sanitize plain text (remove any HTML tags)
export const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

// Sanitize URL
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

// Sanitize object for API requests
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