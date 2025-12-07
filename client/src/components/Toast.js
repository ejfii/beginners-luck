import React, { useEffect } from 'react';
import '../styles/Toast.css';

function Toast({ message, type = 'info', visible, onClose, duration = 2500 }) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      {message}
      <button className="toast-close" onClick={onClose} aria-label="Close">×</button>
    </div>
  );
}

export default Toast;
