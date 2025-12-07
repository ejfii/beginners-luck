/**
 * Money parsing and formatting utilities
 * Supports shorthand input like "50k" or "2M" and formats as proper dollar amounts
 */

/**
 * Parse money input from string with support for shorthand notation
 * @param {string} raw - The input string (e.g., "50k", "$2,000,000", "2M", "1500000")
 * @returns {number | null} - The numeric value, or null if invalid
 * 
 * Examples:
 *   parseMoneyInput("50k") => 50000
 *   parseMoneyInput("2M") => 2000000
 *   parseMoneyInput("2.5m") => 2500000
 *   parseMoneyInput("$2,000,000") => 2000000
 *   parseMoneyInput("1500000") => 1500000
 *   parseMoneyInput("abc") => null
 */
export function parseMoneyInput(raw) {
  if (raw === null || raw === undefined) {
    return null;
  }

  // Convert to string and trim whitespace
  const input = String(raw).trim();
  
  if (input === '' || input === '$') {
    return null;
  }

  // Remove $ and commas
  let cleaned = input.replace(/[$,]/g, '');
  
  // Check for shorthand notation (k, K, m, M)
  const shorthandMatch = cleaned.match(/^([0-9]+\.?[0-9]*)\s*([kmKM])$/);
  
  if (shorthandMatch) {
    const number = parseFloat(shorthandMatch[1]);
    const multiplier = shorthandMatch[2].toLowerCase();
    
    if (isNaN(number)) {
      return null;
    }
    
    if (multiplier === 'k') {
      return number * 1000;
    } else if (multiplier === 'm') {
      return number * 1000000;
    }
  }
  
  // Parse as regular number
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    return null;
  }
  
  return parsed;
}

/**
 * Format a number as a dollar amount with commas
 * @param {number} value - The numeric value to format
 * @param {boolean} includeCents - Whether to include cents (default: false)
 * @returns {string} - Formatted dollar amount (e.g., "$2,000,000")
 * 
 * Examples:
 *   formatMoney(50000) => "$50,000"
 *   formatMoney(2000000) => "$2,000,000"
 *   formatMoney(2500000.50, true) => "$2,500,000.50"
 */
export function formatMoney(value, includeCents = false) {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0
  }).format(value);
}

/**
 * Format a number as currency without the dollar sign
 * Useful for input fields where you want to show formatted numbers
 * @param {number} value - The numeric value to format
 * @returns {string} - Formatted number with commas (e.g., "2,000,000")
 */
export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Create a controlled money input handler for React components
 * Returns an object with value, displayValue, onChange, and onBlur handlers
 * 
 * @param {number | string} initialValue - Initial numeric or string value
 * @param {function} onValueChange - Callback when the numeric value changes (receives number)
 * @returns {object} - Handler object with value, displayValue, onChange, onBlur, error
 * 
 * Usage in component:
 *   const amountHandler = useMoneyInput(myAmount, setMyAmount);
 *   <input
 *     type="text"
 *     value={amountHandler.displayValue}
 *     onChange={amountHandler.onChange}
 *     onBlur={amountHandler.onBlur}
 *   />
 */
export function createMoneyInputHandler(initialValue, onValueChange) {
  const numericValue = typeof initialValue === 'number' ? initialValue : parseMoneyInput(initialValue);
  
  return {
    value: numericValue,
    displayValue: numericValue !== null ? String(numericValue) : '',
    error: null,
    
    onChange: (e) => {
      // Allow free-form typing
      return {
        ...this,
        displayValue: e.target.value
      };
    },
    
    onBlur: (displayValue) => {
      const parsed = parseMoneyInput(displayValue);
      
      if (displayValue.trim() === '') {
        // Empty input is valid (null/0)
        onValueChange(null);
        return {
          value: null,
          displayValue: '',
          error: null
        };
      }
      
      if (parsed === null) {
        // Invalid input
        return {
          value: numericValue,
          displayValue: displayValue,
          error: 'Please enter a valid amount (e.g., 50k, 2M, or 1500000)'
        };
      }
      
      // Valid input - format and update
      onValueChange(parsed);
      return {
        value: parsed,
        displayValue: formatMoney(parsed),
        error: null
      };
    }
  };
}
