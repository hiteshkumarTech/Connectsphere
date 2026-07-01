const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/posts', require('./post.routes'));
router.use('/reels', require('./reel.routes'));
router.use('/bookmarks', require('./bookmark.routes'));
router.use('/comments', require('./comment.routes'));
router.use('/ai', require('./ai.routes'));
router.use('/chat', require('./chat.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/stories', require('./story.routes'));

module.exports = router;
