'use strict';

const { validationResult } = require('express-validator');

/**
 * Middleware to handle express-validator results.
 * Call this after your validation chain.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please check your request data.',
      errors: formattedErrors,
    });
  }

  next();
};

module.exports = { validate };
