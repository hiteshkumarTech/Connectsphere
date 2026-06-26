const { body } = require('express-validator');

const createPost = [
  body('content').optional().isString().isLength({ max: 5000 }),
  body('visibility').optional().isIn(['public', 'followers']),
];

const updatePost = [
  body('content').optional().isString().isLength({ max: 5000 }),
  body('visibility').optional().isIn(['public', 'followers']),
];

const react = [body('type').isIn(['like', 'love', 'fire', 'laugh', 'wow', 'applause'])];

module.exports = { createPost, updatePost, react };
