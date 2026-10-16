const { errorResponse } = require('../utils/response.utils');

/**
 * 404 Route Not Found Handler
 */
const notFoundHandler = (req, res) => {
  return errorResponse(
    res,
    `Endpoint not found: ${req.method} ${req.originalUrl}`,
    'NOT_FOUND',
    null,
    404
  );
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Error]', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  return errorResponse(
    res,
    message,
    code,
    process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    statusCode
  );
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
