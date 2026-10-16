/**
 * Standardized API Response Utilities
 */

const successResponse = (res, message = 'Operation successful', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message = 'An error occurred', code = 'INTERNAL_ERROR', details = null, statusCode = 500) => {
  const payload = {
    success: false,
    message,
    error: {
      code,
    },
  };

  if (details && process.env.NODE_ENV !== 'production') {
    payload.error.details = details;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  successResponse,
  errorResponse,
};
