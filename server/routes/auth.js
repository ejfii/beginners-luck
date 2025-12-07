const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { createUser, getUserByUsername } = require('../database');

// Rate limiting for login endpoint
// Simple in-memory rate limiter to prevent brute force attacks
const loginAttempts = new Map(); // Map of IP/username -> { count, resetTime }
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Rate limiting middleware for login endpoint
 */
function loginRateLimiter(req, res, next) {
  const identifier = `${req.ip}-${req.body.username || 'unknown'}`;
  const now = Date.now();
  const attemptData = loginAttempts.get(identifier);

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance on each request
    for (const [key, data] of loginAttempts.entries()) {
      if (now > data.resetTime) {
        loginAttempts.delete(key);
      }
    }
  }

  if (attemptData) {
    if (now > attemptData.resetTime) {
      // Reset time window has passed
      loginAttempts.delete(identifier);
    } else if (attemptData.count >= MAX_LOGIN_ATTEMPTS) {
      // Too many attempts
      const waitMinutes = Math.ceil((attemptData.resetTime - now) / 60000);
      return res.status(429).json({ 
        error: `Too many login attempts. Please try again in ${waitMinutes} minute(s).`,
        retryAfter: Math.ceil((attemptData.resetTime - now) / 1000)
      });
    }
  }

  // Record this attempt
  if (!attemptData) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  } else {
    attemptData.count++;
  }

  next();
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Hash the password
  bcrypt.hash(password, 10, (err, passwordHash) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to hash password' });
    }

    // Create user in database using the proper createUser function
    createUser(
      { username, password_hash: passwordHash },
      (err, user) => {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Registration failed' });
        }

        const token = generateToken(user.id, username);

        res.status(201).json({
          message: 'User registered successfully',
          userId: user.id,
          username,
          token
        });
      }
    );
  });
});

/**
 * POST /api/auth/login
 * Login user
 * Rate limited to prevent brute force attacks
 */
router.post('/login', loginRateLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  getUserByUsername(username, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Login failed' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare password
    bcrypt.compare(password, user.password_hash, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = generateToken(user.id, user.username);

      res.json({
        message: 'Login successful',
        userId: user.id,
        username: user.username,
        token
      });
    });
  });
});

module.exports = router;
