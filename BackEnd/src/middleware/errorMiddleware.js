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
 * Centralized error handler — no stack traces in production.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;

  console.error(`[ERROR] ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(status).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong',
  });
}
