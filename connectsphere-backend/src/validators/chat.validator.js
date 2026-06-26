const { body } = require('express-validator');

// Either a DM (userId) or a group (participants[] + name).
const createConversation = [
  body('userId').optional().isMongoId(),
  body('participants').optional().isArray({ min: 2, max: 50 }),
  body('participants.*').optional().isMongoId(),
  body('isGroup').optional().isBoolean().toBoolean(),
  body('name').optional().isString().trim().isLength({ max: 80 }),
];

const sendMessage = [
  body('content').optional().isString().isLength({ max: 5000 }),
  body('replyTo').optional({ values: 'falsy' }).isMongoId(),
];

const editMessage = [body('content').isString().trim().isLength({ min: 1, max: 5000 })];

const addParticipants = [
  body('userIds').isArray({ min: 1, max: 50 }),
  body('userIds.*').isMongoId(),
];

module.exports = { createConversation, sendMessage, editMessage, addParticipants };
