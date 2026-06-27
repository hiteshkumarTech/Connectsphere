const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/bookmark.controller');

router.get('/', protect, c.getSavedPosts);
router.post('/:postId', protect, c.savePost);
router.delete('/:postId', protect, c.unsavePost);

module.exports = router;
