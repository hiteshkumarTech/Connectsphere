const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/sendEmail');
const config = require('../config');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/token');

const REFRESH_COOKIE = 'refreshToken';

function parseDurationMs(str) {
  const m = /^(\d+)([smhd])$/.exec(String(str));
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  return n * { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2]];
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
    path: '/api/auth', // cookie is only ever sent to auth endpoints
    maxAge: parseDurationMs(config.jwt.refreshExpires),
  };
}

// Issues an access token, stores a rotated refresh session, sets the cookie.
async function issueSession(user, req, res) {
  const accessToken = signAccessToken({ sub: user.id });
  const refreshToken = signRefreshToken({ sub: user.id });
  user.sessions = user.sessions || [];
  user.sessions.push({
    tokenHash: hashToken(refreshToken),
    userAgent: req.headers['user-agent'] || '',
  });
  if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);
  await user.save();
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  return accessToken;
}

const register = asyncHandler(async (req, res) => {
  const { username, name, email, password } = req.body;

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) {
    const field = exists.email === email ? 'email' : 'username';
    throw ApiError.conflict(`That ${field} is already taken`);
  }

  const user = new User({ username, name, email, password });
  const rawToken = user.createEmailVerifyToken();
  await user.save();

  const verifyUrl = `${config.clientUrl}/verify-email/${rawToken}`;
  await sendEmail({
    to: email,
    subject: 'Verify your ConnectSphere account',
    text: `Welcome to ConnectSphere! Verify your email: ${verifyUrl}`,
    html: `<p>Welcome to ConnectSphere!</p><p><a href="${verifyUrl}">Verify your email</a></p>`,
  });

  const accessToken = await issueSession(user, req, res);
  res.status(201).json({
    success: true,
    message: 'Account created. Check your email to verify your address.',
    data: { user, accessToken },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +sessions');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (user.isBanned) throw ApiError.forbidden('This account has been banned');

  user.lastSeen = new Date();
  const accessToken = await issueSession(user, req, res);
  res.json({ success: true, message: 'Logged in', data: { user, accessToken } });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token');

  const decoded = verifyRefreshToken(token); // throws -> 401 via error handler
  const user = await User.findById(decoded.sub).select('+sessions');
  if (!user || user.isBanned) throw ApiError.unauthorized('Session no longer valid');

  const hash = hashToken(token);
  const idx = user.sessions.findIndex((s) => s.tokenHash === hash);
  if (idx === -1) {
    // Token was valid but is not an active session -> likely reuse/theft.
    // Revoke every session to be safe.
    user.sessions = [];
    await user.save();
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  user.sessions.splice(idx, 1); // rotate: drop the used token
  const accessToken = await issueSession(user, req, res);
  res.json({ success: true, data: { accessToken, user } });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      const user = await User.findById(decoded.sub).select('+sessions');
      if (user) {
        const hash = hashToken(token);
        user.sessions = user.sessions.filter((s) => s.tokenHash !== hash);
        await user.save();
      }
    } catch (_e) {
      /* token already invalid — nothing to revoke */
    }
  }
  res.json({ success: true, message: 'Logged out' });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    emailVerifyToken: hashed,
    emailVerifyExpires: { $gt: Date.now() },
  }).select('+emailVerifyToken +emailVerifyExpires');
  if (!user) throw ApiError.badRequest('Verification link is invalid or has expired');

  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();
  res.json({ success: true, message: 'Email verified' });
});

const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+emailVerifyToken +emailVerifyExpires');
  if (user.emailVerified) {
    return res.json({ success: true, message: 'Email is already verified' });
  }
  const rawToken = user.createEmailVerifyToken();
  await user.save();
  const verifyUrl = `${config.clientUrl}/verify-email/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your ConnectSphere account',
    text: `Verify your email: ${verifyUrl}`,
    html: `<p><a href="${verifyUrl}">Verify your email</a></p>`,
  });
  res.json({ success: true, message: 'Verification email sent' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  // Always respond the same way so attackers can't probe for registered emails.
  if (user) {
    const rawToken = user.createPasswordResetToken();
    await user.save();
    const resetUrl = `${config.clientUrl}/reset-password/${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your ConnectSphere password',
      text: `Reset your password: ${resetUrl} (valid for 1 hour)`,
      html: `<p><a href="${resetUrl}">Reset your password</a> (valid for 1 hour)</p>`,
    });
  }
  res.json({
    success: true,
    message: 'If that email exists, a reset link has been sent',
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires +sessions');
  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired');

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.sessions = []; // log out everywhere after a reset
  await user.save();
  res.json({ success: true, message: 'Password reset. Please log in.' });
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password +sessions');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }
  user.password = req.body.newPassword;
  user.sessions = []; // invalidate other devices
  const accessToken = await issueSession(user, req, res); // keep this device signed in
  res.json({ success: true, message: 'Password updated', data: { accessToken } });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
};
