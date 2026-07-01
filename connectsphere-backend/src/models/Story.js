const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    media: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      thumbnail: { type: String, default: '' }, // for video stories
      duration: { type: Number, default: 0 },
    },
    caption: { type: String, default: '', maxlength: 500 },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: MongoDB removes a story automatically once it expires (~60s granularity).
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema);
