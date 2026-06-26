const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs an array of express-validator chains, then aborts with a 400 if any
 * failed. Usage in routes: validate([...chains]).
 */
const validate = (validations) => async (req, _res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(ApiError.badRequest('Validation failed', errors));
};

module.exports = validate;
