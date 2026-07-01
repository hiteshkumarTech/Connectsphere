const router = require('express').Router();
const ctrl = require('../controllers/story.controller');
const { protect } = require('../middleware/auth');
const { uploadMedia } = require('../middleware/upload');

router.get('/', protect, ctrl.getStoriesFeed);
router.post('/', protect, uploadMedia.single('media'), ctrl.createStory);
router.post('/:id/view', protect, ctrl.viewStory);
router.delete('/:id', protect, ctrl.deleteStory);

module.exports = router;
