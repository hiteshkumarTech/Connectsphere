const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    // A comment targets exactly one of post / reel (enforced in pre-validate).
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null, index: true },
    reel: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', default: null, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    // null = top-level comment; otherwise points to the parent comment (1-level nesting in UI,
    // arbitrary depth supported in data).
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reactionsCount: { type: Number, default: 0, min: 0 },
    repliesCount: { type: Number, default: 0, min: 0 },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, parent: 1, createdAt: 1 });
commentSchema.index({ reel: 1, createdAt: -1 });

// A comment must belong to a post OR a reel — never both, never neither.
commentSchema.pre('validate', function ensureTarget(next) {
  const hasPost = Boolean(this.post);
  const hasReel = Boolean(this.reel);
  if (hasPost === hasReel) {
    return next(new Error('Comment must belong to exactly one of a post or a reel'));
  }
  next();
});

module.exports = mongoose.model('Comment', commentSchema);
