const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
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

module.exports = mongoose.model('Comment', commentSchema);
