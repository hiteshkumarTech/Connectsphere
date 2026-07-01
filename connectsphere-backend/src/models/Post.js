const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    width: Number,
    height: Number,
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['text', 'image', 'reel'], default: 'text' },
    content: { type: String, default: '', maxlength: 5000 },
    images: { type: [mediaSchema], default: [] }, // 1..n supports single + carousel
    video: { type: videoSchema, default: null }, // populated for reels

    hashtags: { type: [String], default: [], index: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    visibility: { type: String, enum: ['public', 'followers'], default: 'public' },
    pinned: { type: Boolean, default: false },

    reactionsCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    sharesCount: { type: Number, default: 0, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0 },

    moderation: {
      status: { type: String, enum: ['clean', 'flagged'], default: 'clean' },
      reason: { type: String, default: '' },
    },

    editedAt: { type: Date },
  },
  { timestamps: true }
);

// Feed and profile queries are author + recency ordered.
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
// Full-text search over post content (used by the search module later).
postSchema.index({ content: 'text' });

// Derived trending score — kept out of the DB so the formula can evolve freely.
postSchema.virtual('trendingScore').get(function trendingScore() {
  return (
    this.reactionsCount * 3 +
    this.commentsCount * 5 +
    this.sharesCount * 7 +
    this.viewsCount * 1
  );
});

postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
