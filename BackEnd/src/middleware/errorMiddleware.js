/**
 * 404 handler — catches requests to undefined routes.
 */
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
}

/**
 * Centralized error handler — strictly hardened for production.
 * Prevents stack traces, ORM class names, database paths, or internals from leaking.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;

  console.error(`[ERROR] ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

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
