const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    videoUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },

    caption: { type: String, default: '', maxlength: 2200 },
    hashtags: { type: [String], default: [], index: true },

    duration: { type: Number, default: 0 }, // seconds
    width: Number,
    height: Number,

    reactionsCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    sharesCount: { type: Number, default: 0, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

reelSchema.index({ author: 1, createdAt: -1 });
reelSchema.index({ createdAt: -1 });

// Same trending formula shape as posts, kept out of the DB so it can evolve.
reelSchema.virtual('trendingScore').get(function trendingScore() {
  return (
    this.reactionsCount * 3 +
    this.commentsCount * 5 +
    this.sharesCount * 7 +
    this.viewsCount * 1
  );
});

reelSchema.set('toJSON', { virtuals: true });
reelSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Reel', reelSchema);
