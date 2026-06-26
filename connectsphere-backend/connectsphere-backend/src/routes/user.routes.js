const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const validate = require('../middleware/validate');
const v = require('../validators/user.validator');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

// Literal routes first so they aren't captured by /:username.
router.get('/search', optionalAuth, ctrl.searchUsers);
router.get('/suggestions', protect, ctrl.getSuggestions);
router.patch('/me', protect, validate(v.updateProfile), ctrl.updateProfile);
router.patch('/me/username', protect, validate(v.updateUsername), ctrl.updateUsername);
router.post('/me/avatar', protect, uploadImage.single('image'), ctrl.uploadAvatar);
router.post('/me/cover', protect, uploadImage.single('image'), ctrl.uploadCover);

router.get('/:username', optionalAuth, ctrl.getProfile);
router.get('/:username/followers', optionalAuth, ctrl.getFollowers);
router.get('/:username/following', optionalAuth, ctrl.getFollowing);
router.post('/:username/follow', protect, ctrl.followUser);
router.delete('/:username/follow', protect, ctrl.unfollowUser);

module.exports = router;
