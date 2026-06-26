const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/token');
const User = require('../models/User');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

async function resolveUser(token) {
  const decoded = verifyAccessToken(token); // throws on invalid/expired
  const user = await User.findById(decoded.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.isBanned) throw ApiError.forbidden('This account has been banned');
  if (user.changedPasswordAfter(decoded.iat)) {
    throw ApiError.unauthorized('Password recently changed, please log in again');
  }
  return user;
}

// Hard gate: request must be authenticated.
const protect = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required');
  req.user = await resolveUser(token);
  next();
});

// Soft gate: attaches req.user when a valid token is present, otherwise continues.
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = await resolveUser(token);
  } catch (_e) {
    /* ignore — treat as anonymous */
  }
  next();
});

const restrictTo = (...roles) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  });

module.exports = { protect, optionalAuth, restrictTo };
