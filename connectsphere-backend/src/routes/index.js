const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/posts', require('./post.routes'));
router.use('/comments', require('./comment.routes'));
router.use('/ai', require('./ai.routes'));
router.use('/chat', require('./chat.routes'));
router.use('/notifications', require('./notification.routes'));

module.exports = router;
