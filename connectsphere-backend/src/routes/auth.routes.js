const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const v = require('../validators/auth.validator');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, validate(v.register), ctrl.register);
router.post('/login', authLimiter, validate(v.login), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/verify-email/:token', validate(v.verifyEmail), ctrl.verifyEmail);
router.post('/resend-verification', protect, ctrl.resendVerification);
router.post('/forgot-password', authLimiter, validate(v.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password/:token', authLimiter, validate(v.resetPassword), ctrl.resetPassword);
router.post('/change-password', protect, validate(v.changePassword), ctrl.changePassword);
router.get('/me', protect, ctrl.getMe);

module.exports = router;
