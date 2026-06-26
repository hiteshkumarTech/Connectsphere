const router = require('express').Router();
const ctrl = require('../controllers/chat.controller');
const validate = require('../middleware/validate');
const v = require('../validators/chat.validator');
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

router.use(protect); // every chat endpoint requires auth

router.get('/unread', ctrl.getUnreadTotal);

router.get('/conversations', ctrl.getConversations);
router.post('/conversations', validate(v.createConversation), ctrl.createOrGetConversation);

router.get('/conversations/:id/messages', ctrl.getMessages);
router.post(
  '/conversations/:id/messages',
  uploadImage.array('attachments', 5),
  validate(v.sendMessage),
  ctrl.sendMessage
);
router.post('/conversations/:id/read', ctrl.markRead);
router.delete('/conversations/:id', ctrl.clearConversation);
router.post('/conversations/:id/leave', ctrl.leaveConversation);
router.post('/conversations/:id/participants', validate(v.addParticipants), ctrl.addParticipants);

router.patch('/messages/:id', validate(v.editMessage), ctrl.editMessage);
router.delete('/messages/:id', ctrl.deleteMessage);

module.exports = router;
