const { body } = require('express-validator');

const caption = [
  body('topic').isString().trim().isLength({ min: 1, max: 500 }),
  body('tone').optional().isIn(['casual', 'professional', 'viral', 'witty', 'inspirational']),
  body('count').optional().isInt({ min: 1, max: 5 }).toInt(),
];

const improve = [
  body('text').isString().trim().isLength({ min: 1, max: 5000 }),
  body('action').isIn(['grammar', 'tone', 'expand', 'rewrite']),
];

const moderate = [body('content').isString().trim().isLength({ min: 1, max: 5000 })];

module.exports = { caption, improve, moderate };
