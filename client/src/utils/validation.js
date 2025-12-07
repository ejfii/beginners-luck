/**
 * Frontend Validation Utilities
 * Helpers for displaying backend validation errors and client-side validation
 */

/**
 * Extract field-level errors from API error response
 * @param {Object} error - Error from API response
 * @returns {Object} - Field-level errors object { fieldName: 'error message' }
 */
export function extractFieldErrors(error) {
  if (!error) return {};
  
  // If error.details exists, it's already field-level errors from our backend
  if (error.details && typeof error.details === 'object') {
    return error.details;
  }
  
  // Legacy format: error.error is a single message
  if (error.error && typeof error.error === 'string') {
    return { _general: error.error };
  }
  
  return { _general: 'An unexpected error occurred' };
}

/**
 * Get error message for a specific field
 * @param {Object} errors - Field errors object
 * @param {string} fieldName - Name of the field
 * @returns {string|null} - Error message or null
 */
export function getFieldError(errors, fieldName) {
  if (!errors || typeof errors !== 'object') return null;
  return errors[fieldName] || null;
}

/**
 * Check if any validation errors exist
 * @param {Object} errors - Field errors object
 * @returns {boolean}
 */
export function hasErrors(errors) {
  if (!errors || typeof errors !== 'object') return false;
  return Object.keys(errors).length > 0;
}

/**
 * Get general error message (not field-specific)
 * @param {Object} errors - Field errors object
 * @returns {string|null}
 */
export function getGeneralError(errors) {
  if (!errors || typeof errors !== 'object') return null;
  return errors._general || null;
}

/**
 * Client-side validation constants (should match backend)
 */
export const VALIDATION_CONSTANTS = {
  MAX_MONEY_VALUE: 1e9,
  MAX_STRING_LENGTH: 255,
  MAX_LONG_TEXT_LENGTH: 5000
};

/**
 * Validate money amount
 * @param {number} amount - Amount to validate
 * @returns {string|null} - Error message or null
 */
export function validateMoneyAmount(amount) {
  if (amount === undefined || amount === null || amount === '') {
    return 'Amount is required';
  }
  
  const num = parseFloat(amount);
  if (isNaN(num)) {
    return 'Amount must be a valid number';
  }
  
  if (num <= 0) {
    return 'Amount must be greater than 0';
  }
  
  if (num > VALIDATION_CONSTANTS.MAX_MONEY_VALUE) {
    return `Amount must be less than $${VALIDATION_CONSTANTS.MAX_MONEY_VALUE.toLocaleString()}`;
  }
  
  return null;
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Name of field for error message
 * @returns {string|null} - Error message or null
 */
export function validateStringLength(value, maxLength = VALIDATION_CONSTANTS.MAX_STRING_LENGTH, fieldName = 'Field') {
  if (!value) return null;
  
  if (typeof value !== 'string') {
    return `${fieldName} must be text`;
  }
  
  if (value.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }
  
  return null;
}

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of field for error message
 * @returns {string|null} - Error message or null
 */
export function validateRequired(value, fieldName = 'Field') {
  if (value === undefined || value === null || value === '') {
    return `${fieldName} is required`;
  }
  
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} is required`;
  }
  
  return null;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {string|null} - Error message or null
 */
export function validateEmail(email) {
  if (!email) return null; // Optional field
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  
  return null;
}

/**
 * Validate date is in the future
 * @param {string} dateStr - ISO date string
 * @returns {string|null} - Error message or null
 */
export function validateFutureDate(dateStr) {
  if (!dateStr) return 'Date is required';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return 'Invalid date format';
  }
  
  if (date <= new Date()) {
    return 'Date must be in the future';
  }
  
  return null;
}

/**
 * Format validation errors for display
 * Converts field errors object to array of error messages
 * @param {Object} errors - Field errors object
 * @returns {Array} - Array of error messages
 */
export function formatErrorsForDisplay(errors) {
  if (!errors || typeof errors !== 'object') return [];
  
  return Object.entries(errors).map(([field, message]) => {
    if (field === '_general') return message;
    return `${field}: ${message}`;
  });
}

/**
 * Clear specific field error from errors object
 * Returns a new object without the specified field error
 * @param {Object} errors - Current errors object
 * @param {string} fieldName - Field to clear
 * @returns {Object} - New errors object
 */
export function clearFieldError(errors, fieldName) {
  if (!errors || !fieldName) return errors;
  
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
}
