const { body, param } = require('express-validator');

const password = () =>
  body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
    .matches(/[a-z]/)
    .withMessage('Password must include a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include a number');

const register = [
  body('username')
    .isString()
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers and underscores'),
  body('name').isString().trim().isLength({ min: 1, max: 60 }),
  body('email').isEmail().normalizeEmail(),
  password(),
];

const login = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
];

const forgotPassword = [body('email').isEmail().normalizeEmail()];

const resetPassword = [param('token').isString().notEmpty(), password()];

const changePassword = [
  body('currentPassword').isString().notEmpty(),
  body('newPassword')
    .isString()
    .isLength({ min: 8, max: 128 })
    .matches(/[a-z]/)
    .matches(/[A-Z]/)
    .matches(/[0-9]/)
    .withMessage('New password must be 8+ chars with upper, lower and a number'),
];

const verifyEmail = [param('token').isString().notEmpty()];

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
};
