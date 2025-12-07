import React, { useState } from 'react';
import '../styles/LoginRegister.css';

/**
 * LoginRegister Component
 * Handles both login and registration
 */
function LoginRegister({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed');
        setLoading(false);
        return;
      }

      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('username', data.username);

      // Callback to parent component
      onLoginSuccess({
        userId: data.userId,
        username: data.username,
        token: data.token,
      });
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error('Auth error:', err);
    }

    setLoading(false);
  };

  return (
    <div className="login-register-container">
      <div className="login-register-card">
        <h1 className="login-register-title">
          {isRegistering ? 'Create Account' : 'Login'}
        </h1>

        {error && <div className="login-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
            />
          </div>

          {isRegistering && (
            <p className="password-hint">Password must be at least 6 characters</p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : isRegistering ? 'Create Account' : 'Login'}
          </button>
        </form>

        <div className="login-toggle">
          <p>
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="toggle-link"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              disabled={loading}
            >
              {isRegistering ? 'Login' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginRegister;
