/**
 * Logging middleware for request/response tracking
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    res.send = originalSend;
    return res.send(data);
  };

  next();
}

/**
 * Error handling middleware
 * Provides comprehensive error logging with request context and normalized responses
 */
function errorHandler(err, req, res, next) {
  // Skip if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Build request context for logging
  const requestContext = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userId: req.userId || 'anonymous',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  };

  // Determine error type and status code
  const isValidationError = err.status === 400 || err.name === 'ValidationError';
  const statusCode = err.status || err.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Log error with context
  if (isServerError) {
    console.error('=== SERVER ERROR ===');
    console.error('Context:', JSON.stringify(requestContext, null, 2));
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    console.error('===================');
  } else {
    console.warn(`[${requestContext.timestamp}] ${requestContext.method} ${requestContext.path} - ${statusCode}: ${err.message}`);
  }

  // Build response based on error type
  const response = {
    error: err.message || 'Internal Server Error',
    status: statusCode
  };

  // Add validation details if present
  if (isValidationError && err.details) {
    response.details = err.details;
  }

  // Add stack trace in development mode (never in production)
  if (process.env.NODE_ENV !== 'production' && isServerError) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  requestLogger,
  errorHandler
};
