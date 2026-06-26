const router = require('express').Router();
const { protect, optionalAuth } = require('../middleware/auth');
const c = require('../controllers/reel.controller');

// Specific path must be declared before the dynamic "/:id" GET.
router.get('/upload-signature', protect, c.getUploadSignature);

router.post('/', protect, c.createReel);
router.get('/', optionalAuth, c.getReels);

router.get('/:id', optionalAuth, c.getReel);
router.delete('/:id', protect, c.deleteReel);

router.post('/:id/view', optionalAuth, c.viewReel);
router.post('/:id/like', protect, c.likeReel);
router.delete('/:id/like', protect, c.unlikeReel);
router.post('/:id/share', optionalAuth, c.shareReel);

router.get('/:id/comments', optionalAuth, c.listReelComments);
router.post('/:id/comments', protect, c.addReelComment);
router.delete('/:id/comments/:commentId', protect, c.deleteReelComment);

module.exports = router;
