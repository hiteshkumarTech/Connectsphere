const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, meta } = require('../utils/pagination');

const SENDER_FIELDS = 'username name avatar verifiedBadge';

const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, { defaultLimit: 20, maxLimit: 50 });
  const filter = { recipient: req.user.id };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', SENDER_FIELDS)
      .populate('post', 'content images')
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user.id, read: false }),
  ]);

  res.json({
    success: true,
    data: { notifications, unreadCount, pagination: meta(page, limit, total) },
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ recipient: req.user.id, read: false });
  res.json({ success: true, data: { unreadCount } });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked read' });
});

const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, recipient: req.user.id }, { read: true });
  res.json({ success: true, message: 'Notification marked read' });
});

module.exports = { getNotifications, getUnreadCount, markAllRead, markRead };
