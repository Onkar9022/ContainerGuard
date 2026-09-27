import logger from '../utils/logger.js';

/**
 * 404 handler — catches requests to undefined routes.
 */
export function notFoundHandler(req, res, _next) {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.headers['x-forwarded-for'],
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
}

/**
 * Centralized error handler — strictly hardened for production.
 * Logs full structured error context internally while keeping API responses sanitized.
 */
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;

  // Log error with rich context for CloudWatch / Docker log collection
  logger.error(`HTTP request error: ${err.message}`, {
    status,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.headers['x-forwarded-for'],
    errorName: err.name,
    code: err.code || err.statusCode || undefined,
    stack: err.stack,
  });

  const isDev = process.env.NODE_ENV === 'development';

  // Sanitize internal ORM / database error names and messages in production
  const errorName = isDev
    ? (err.name || 'Internal Server Error')
    : (status < 500 ? (err.name || 'Client Error') : 'Internal Server Error');

  const errorMessage = isDev
    ? err.message
    : (status < 500 ? err.message : 'An unexpected error occurred.');

  res.status(status).json({
    error: errorName,
    message: errorMessage,
  });
}
