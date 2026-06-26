const mongoose = require('mongoose');

// Per-participant state lives on the conversation so a user's unread count and
// read position are a single cheap read alongside the thread itself.
const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    unreadCount: { type: Number, default: 0, min: 0 },
    lastReadAt: { type: Date },
    muted: { type: Boolean, default: false },
    // When a user "clears" a DM, history before this point is hidden for them only.
    clearedAt: { type: Date },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, trim: true, maxlength: 80 }, // group title
    avatar: { type: String, default: '' }, // group avatar
    members: { type: [memberSchema], required: true },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // group admins
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Deterministic key for 1:1 chats ("idA_idB" sorted) — a unique sparse index
    // guarantees exactly one DM thread per pair. Undefined for group chats.
    dmKey: { type: String, index: { unique: true, sparse: true } },

    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Conversation list = "my conversations newest-first".
conversationSchema.index({ 'members.user': 1, lastMessageAt: -1 });

// Builds the deterministic DM key for two user ids.
conversationSchema.statics.buildDmKey = (a, b) => [String(a), String(b)].sort().join('_');

module.exports = mongoose.model('Conversation', conversationSchema);
