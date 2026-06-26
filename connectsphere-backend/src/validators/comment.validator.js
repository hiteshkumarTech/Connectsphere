const { body } = require('express-validator');

const createComment = [
  body('content').isString().trim().isLength({ min: 1, max: 2000 }),
  body('parent').optional({ values: 'null' }).isMongoId(),
];

const updateComment = [body('content').isString().trim().isLength({ min: 1, max: 2000 })];

module.exports = { createComment, updateComment };
