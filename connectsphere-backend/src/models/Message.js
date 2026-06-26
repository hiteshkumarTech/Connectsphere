const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
    type: { type: String, enum: ['image'], default: 'image' },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '', maxlength: 5000 },
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    attachments: { type: [attachmentSchema], default: [] },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    deleted: { type: Boolean, default: false }, // soft delete -> "message deleted"
    editedAt: { type: Date },
  },
  { timestamps: true }
);

// Paginated thread history.
messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
