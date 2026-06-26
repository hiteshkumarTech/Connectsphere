const mongoose = require('mongoose');

const REACTION_TYPES = ['like', 'love', 'fire', 'laugh', 'wow', 'applause'];
const REACTION_EMOJI = {
  like: '👍',
  love: '❤️',
  fire: '🔥',
  laugh: '😂',
  wow: '😮',
  applause: '👏',
};

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['post', 'comment', 'reel'], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: REACTION_TYPES, default: 'like' },
  },
  { timestamps: true }
);

// One reaction per user per target; switching emoji updates the existing row.
reactionSchema.index({ user: 1, targetType: 1, target: 1 }, { unique: true });
reactionSchema.index({ targetType: 1, target: 1 });

const Reaction = mongoose.model('Reaction', reactionSchema);
Reaction.TYPES = REACTION_TYPES;
Reaction.EMOJI = REACTION_EMOJI;

module.exports = Reaction;
