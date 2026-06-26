/**
 * Wraps async route handlers so rejected promises are forwarded to next()
 * instead of crashing the process. Removes try/catch boilerplate everywhere.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
