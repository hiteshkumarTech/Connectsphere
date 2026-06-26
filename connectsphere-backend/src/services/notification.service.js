const Notification = require('../models/Notification');
const { emitToUser } = require('../socket');

/**
 * Creates a notification and pushes it to the recipient in real time.
 * No-ops when the actor would be notifying themselves.
 */
async function notify({ recipient, sender, type, post, comment, reactionType }) {
  if (String(recipient) === String(sender)) return null;

  const notification = await Notification.create({
    recipient,
    sender,
    type,
    post,
    comment,
    reactionType,
  });

  const populated = await notification.populate(
    'sender',
    'username name avatar verifiedBadge'
  );

  const unreadCount = await Notification.countDocuments({ recipient, read: false });

  emitToUser(recipient, 'notification:new', { notification: populated, unreadCount });
  return populated;
}

module.exports = { notify };
