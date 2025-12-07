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
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`, err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
}

module.exports = {
  requestLogger,
  errorHandler
};
