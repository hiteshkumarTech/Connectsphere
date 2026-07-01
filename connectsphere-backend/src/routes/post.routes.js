const router = require('express').Router();
const ctrl = require('../controllers/post.controller');
const commentCtrl = require('../controllers/comment.controller');
const validate = require('../middleware/validate');
const v = require('../validators/post.validator');
const commentV = require('../validators/comment.validator');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadImage, uploadVideo } = require('../middleware/upload');

// Literal / nested routes before /:id.
router.get('/feed', protect, ctrl.getFeed);
router.get('/explore', optionalAuth, ctrl.getExplore);
router.get('/hashtag/:tag', optionalAuth, ctrl.getByHashtag);
router.get('/search', optionalAuth, ctrl.searchPosts);
router.get('/hashtags/trending', optionalAuth, ctrl.getTrendingHashtags);
router.get('/reels', optionalAuth, ctrl.getReels);
router.get('/user/:username', optionalAuth, ctrl.getUserPosts);

router.post('/', protect, uploadImage.array('images', 10), validate(v.createPost), ctrl.createPost);
router.post('/reels', protect, uploadVideo.single('video'), ctrl.createReel);

// Post-scoped comments.
router.get('/:postId/comments', optionalAuth, commentCtrl.getComments);
router.post('/:postId/comments', protect, validate(commentV.createComment), commentCtrl.createComment);

router.get('/:id', optionalAuth, ctrl.getPost);
router.patch('/:id', protect, validate(v.updatePost), ctrl.updatePost);
router.delete('/:id', protect, ctrl.deletePost);
router.post('/:id/react', protect, validate(v.react), ctrl.reactToPost);
router.delete('/:id/react', protect, ctrl.unreactToPost);
router.post('/:id/pin', protect, ctrl.pinPost);
router.post('/:id/share', optionalAuth, ctrl.sharePost);

module.exports = router;
