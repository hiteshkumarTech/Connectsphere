const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const validate = require('../middleware/validate');
const v = require('../validators/ai.validator');
const { protect } = require('../middleware/auth');

router.use(protect); // all AI endpoints require authentication

router.get('/status', ctrl.status);
router.post('/caption', validate(v.caption), ctrl.caption);
router.post('/improve', validate(v.improve), ctrl.improve);
router.post('/moderate', validate(v.moderate), ctrl.moderate);

module.exports = router;
