/**
 * ErrorMessage Component
 * Displays field-level validation errors
 */
import React from 'react';
import './ErrorMessage.css';

export default function ErrorMessage({ error, className = '' }) {
  if (!error) return null;
  
  return (
    <div className={`error-message ${className}`}>
      {error}
    </div>
  );
}
