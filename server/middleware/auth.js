const jwt = require('jsonwebtoken');

// JWT Configuration
// CRITICAL: JWT_SECRET must be set in production via environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '12h'; // Default 12 hours

// Warn if using default secret in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: JWT_SECRET not set! Using default secret is insecure in production.');
}

/**
 * Verify JWT token and attach user to request
 */
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Distinguish between expired token and other errors
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  });
}

/**
 * Generate JWT token with configurable expiration
 */
function generateToken(userId, username) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

module.exports = { verifyToken, generateToken, JWT_SECRET, JWT_EXPIRATION };
