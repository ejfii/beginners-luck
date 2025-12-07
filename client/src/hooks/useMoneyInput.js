import { useState, useCallback } from 'react';
import { parseMoneyInput, formatMoney } from '../utils/money';

/**
 * Custom React hook for managing money input fields
 * Handles parsing, formatting, and validation automatically
 * 
 * @param {number | null} initialValue - Initial numeric value
 * @param {function} onValueChange - Callback when the valid numeric value changes
 * @returns {object} - { displayValue, onChange, onBlur, error }
 * 
 * Usage:
 *   const [amount, setAmount] = useState(0);
 *   const amountInput = useMoneyInput(amount, setAmount);
 *   
 *   <input
 *     type="text"
 *     value={amountInput.displayValue}
 *     onChange={amountInput.onChange}
 *     onBlur={amountInput.onBlur}
 *   />
 *   {amountInput.error && <span className="error">{amountInput.error}</span>}
 */
export function useMoneyInput(initialValue, onValueChange) {
  // Display value is what the user sees (can be "50k", "$2,000,000", etc.)
  const [displayValue, setDisplayValue] = useState(() => {
    return initialValue ? formatMoney(initialValue) : '';
  });
  
  const [error, setError] = useState(null);

  // Handle user typing - allow any input
  const onChange = useCallback((e) => {
    setDisplayValue(e.target.value);
    setError(null);
  }, []);

  // Handle blur - parse and format
  const onBlur = useCallback(() => {
    const trimmed = displayValue.trim();
    
    // Empty is valid - treat as null/0
    if (trimmed === '') {
      setDisplayValue('');
      setError(null);
      onValueChange(null);
      return;
    }
    
    // Try to parse
    const parsed = parseMoneyInput(trimmed);
    
    if (parsed === null) {
      setError('Please enter a valid amount (e.g., 50k, 2M, or 1500000)');
      return;
    }
    
    if (parsed < 0) {
      setError('Amount cannot be negative');
      return;
    }
    
    // Valid input - format and update
    setDisplayValue(formatMoney(parsed));
    setError(null);
    onValueChange(parsed);
  }, [displayValue, onValueChange]);

  return {
    displayValue,
    onChange,
    onBlur,
    error
  };
}
