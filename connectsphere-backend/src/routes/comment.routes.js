const router = require('express').Router();
const ctrl = require('../controllers/comment.controller');
const validate = require('../middleware/validate');
const v = require('../validators/comment.validator');
const { react } = require('../validators/post.validator'); // shared reaction-type validator
const { protect, optionalAuth } = require('../middleware/auth');

// Comment-scoped operations (creation/listing per post lives under /posts).
router.get('/:commentId/replies', optionalAuth, ctrl.getReplies);
router.patch('/:id', protect, validate(v.updateComment), ctrl.updateComment);
router.delete('/:id', protect, ctrl.deleteComment);
router.post('/:id/react', protect, validate(react), ctrl.reactToComment);
router.delete('/:id/react', protect, ctrl.unreactToComment);

module.exports = router;
