const { body } = require('express-validator');

const updateProfile = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 60 }),
  body('bio').optional().isString().isLength({ max: 300 }),
  body('location').optional().isString().isLength({ max: 100 }),
  body('website').optional({ values: 'falsy' }).isURL().withMessage('Website must be a valid URL'),
  body('skills').optional().isArray({ max: 30 }),
  body('skills.*').optional().isString().isLength({ max: 40 }),
  body('interests').optional().isArray({ max: 30 }),
  body('interests.*').optional().isString().isLength({ max: 40 }),
  body('privacy').optional().isIn(['public', 'private']),
  body('socialLinks.github').optional({ values: 'falsy' }).isURL(),
  body('socialLinks.linkedin').optional({ values: 'falsy' }).isURL(),
  body('socialLinks.twitter').optional({ values: 'falsy' }).isURL(),
];

const updateUsername = [
  body('username')
    .isString()
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers and underscores'),
];

module.exports = { updateProfile, updateUsername };
