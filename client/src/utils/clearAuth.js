/**
 * @file clearAuth.js
 * @purpose Legacy authentication clearing utility - wrapper for modern auth operations
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import { authOperations } from './auth';

/**
 * Clear all authentication data (legacy compatibility function)
 * 
 * @description Legacy export that delegates to authOperations.clearAllAuth.
 * Provided for backward compatibility. New code should use authOperations directly.
 * 
 * @function clearAuthData
 * @deprecated Use authOperations.clearAllAuth from './auth' instead
 */
export const clearAuthData = authOperations.clearAllAuth;