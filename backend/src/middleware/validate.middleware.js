const { errorResponse } = require('../utils/response.utils');

/**
 * Validation Middleware Runner
 * Executes a validation function or list of validator rules on the request.
 */
const validate = (validatorFn) => {
  return (req, res, next) => {
    try {
      const errors = validatorFn(req);
      if (errors && errors.length > 0) {
        return errorResponse(
          res,
          'Validation failed. Please verify your input data.',
          'VALIDATION_ERROR',
          errors,
          400
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  validate,
};
