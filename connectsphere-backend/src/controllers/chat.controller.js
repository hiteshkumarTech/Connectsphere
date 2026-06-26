const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, meta } = require('../utils/pagination');
const { uploadBuffer, deleteImage } = require('../utils/cloudinaryUpload');
const { emitToUser, emitToUsers, isOnline } = require('../socket');

const USER_FIELDS = 'username name avatar verifiedBadge';

const uid = (v) => String(v._id || v);

// Shapes a conversation for a specific viewer: their unread/mute state, and for
// DMs the "other" user plus live presence.
function serializeConversation(convo, viewerId) {
  const meMember = convo.members.find((m) => uid(m.user) === String(viewerId));
  const others = convo.members.filter((m) => uid(m.user) !== String(viewerId));
  const otherUser = !convo.isGroup && others[0] ? others[0].user : null;

  return {
    _id: convo._id,
    isGroup: convo.isGroup,
    name: convo.isGroup ? convo.name : null,
    avatar: convo.isGroup ? convo.avatar : otherUser?.avatar || '',
    members: convo.members.map((m) => m.user),
    otherUser,
    unreadCount: meMember ? meMember.unreadCount : 0,
    muted: meMember ? meMember.muted : false,
    online: !convo.isGroup && otherUser ? isOnline(uid(otherUser)) : undefined,
    lastMessage: convo.lastMessage || null,
    lastMessageAt: convo.lastMessageAt,
    createdAt: convo.createdAt,
    updatedAt: convo.updatedAt,
  };
}

async function loadMembership(conversationId, userId) {
  const convo = await Conversation.findOne({ _id: conversationId, 'members.user': userId });
  if (!convo) throw ApiError.notFound('Conversation not found');
  return convo;
}

// POST /conversations — open (or create) a DM, or create a group.
const createOrGetConversation = asyncHandler(async (req, res) => {
  const meId = req.user.id;
  const { userId, participants = [], isGroup = false, name } = req.body;

  if (!isGroup) {
    const otherId = userId || (participants.length === 1 ? participants[0] : null);
    if (!otherId) throw ApiError.badRequest('A direct conversation needs a userId');
    if (String(otherId) === meId) throw ApiError.badRequest('You cannot message yourself');
    const other = await User.findById(otherId).select('_id isBanned');
    if (!other || other.isBanned) throw ApiError.notFound('User not found');

    const dmKey = Conversation.buildDmKey(meId, otherId);
    let convo = await Conversation.findOne({ dmKey });
    let created = false;
    if (!convo) {
      try {
        convo = await Conversation.create({
          isGroup: false,
          dmKey,
          members: [{ user: meId }, { user: otherId }],
          createdBy: meId,
        });
        created = true;
      } catch (err) {
        if (err.code === 11000) convo = await Conversation.findOne({ dmKey });
        else throw err;
      }
    }

    await convo.populate('members.user', USER_FIELDS);
    await convo.populate({ path: 'lastMessage', populate: { path: 'sender', select: USER_FIELDS } });

    if (created) {
      emitToUser(otherId, 'conversation:new', {
        conversation: serializeConversation(convo, otherId),
      });
    }
    return res
      .status(created ? 201 : 200)
      .json({ success: true, data: { conversation: serializeConversation(convo, meId) } });
  }

  // Group conversation.
  const unique = [...new Set([meId, ...participants.map(String)])];
  if (unique.length < 2) throw ApiError.badRequest('A group needs at least 2 members');
  const found = await User.find({ _id: { $in: unique }, isBanned: false }).select('_id');
  if (found.length !== unique.length) throw ApiError.badRequest('One or more users were not found');

  const convo = await Conversation.create({
    isGroup: true,
    name: name || 'New group',
    members: unique.map((u) => ({ user: u })),
    admins: [meId],
    createdBy: meId,
  });
  await convo.populate('members.user', USER_FIELDS);

  unique
    .filter((u) => u !== meId)
    .forEach((u) => emitToUser(u, 'conversation:new', { conversation: serializeConversation(convo, u) }));

  res.status(201).json({ success: true, data: { conversation: serializeConversation(convo, meId) } });
});

// GET /conversations — the viewer's conversation list, newest activity first.
const getConversations = asyncHandler(async (req, res) => {
  const meId = req.user.id;
  const { page, limit, skip } = getPagination(req, { defaultLimit: 20, maxLimit: 50 });
  const filter = { 'members.user': meId };

  const [convos, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('members.user', USER_FIELDS)
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username name' } }),
    Conversation.countDocuments(filter),
  ]);

  const conversations = convos.map((c) => serializeConversation(c, meId));
  res.json({ success: true, data: { conversations, pagination: meta(page, limit, total) } });
});

// GET /conversations/:id/messages — paginated history (newest first).
const getMessages = asyncHandler(async (req, res) => {
  const meId = req.user.id;
  const convo = await loadMembership(req.params.id, meId);
  const myMember = convo.members.find((m) => uid(m.user) === meId);

  const { page, limit, skip } = getPagination(req, { defaultLimit: 30, maxLimit: 50 });
  const filter = { conversation: convo._id };
  if (myMember.clearedAt) filter.createdAt = { $gt: myMember.clearedAt };

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', USER_FIELDS)
      .populate({
        path: 'replyTo',
        select: 'sender content type deleted',
        populate: { path: 'sender', select: 'username name' },
      })
      .lean(),
    Message.countDocuments(filter),
  ]);

  // lastReadAt per member powers read receipts on the client without per-message writes.
  const readState = convo.members.map((m) => ({ user: m.user, lastReadAt: m.lastReadAt || null }));
  res.json({ success: true, data: { messages, readState, pagination: meta(page, limit, total) } });
});

// POST /conversations/:id/messages — send a message and fan it out in real time.
const sendMessage = asyncHandler(async (req, res) => {
  const meId = req.user.id;
  const convo = await loadMembership(req.params.id, meId);

  const content = (req.body.content || '').trim();
  const files = req.files || [];
  let attachments = [];
  if (files.length) {
    attachments = await Promise.all(
      files.map(async (f) => ({ ...(await uploadBuffer(f.buffer, 'connectsphere/chat')), type: 'image' }))
    );
  }
  if (!content && attachments.length === 0) {
    throw ApiError.badRequest('A message needs text or an attachment');
  }

  let replyTo = null;
  if (req.body.replyTo) {
    const r = await Message.findOne({ _id: req.body.replyTo, conversation: convo._id }).select('_id');
    if (r) replyTo = r._id;
  }

  const message = await Message.create({
    conversation: convo._id,
    sender: meId,
    content,
    type: attachments.length ? 'image' : 'text',
    attachments,
    replyTo,
  });

  convo.lastMessage = message._id;
  convo.lastMessageAt = message.createdAt;
  convo.members.forEach((m) => {
    if (uid(m.user) === meId) {
      m.unreadCount = 0;
      m.lastReadAt = new Date();
    } else {
      m.unreadCount = (m.unreadCount || 0) + 1;
    }
  });
  await convo.save();

  const populated = await Message.findById(message._id)
    .populate('sender', USER_FIELDS)
    .populate({
      path: 'replyTo',
      select: 'sender content type deleted',
      populate: { path: 'sender', select: 'username name' },
    })
    .lean();

  const recipients = convo.members.map((m) => uid(m.user));
  emitToUsers(recipients, 'message:new', {
    conversationId: String(convo._id),
    message: populated,
  });

  res.status(201).json({ success: true, data: { message: populated } });
});

// POST /conversations/:id/read — clear unread + broadcast a read receipt.
const markRead = asyncHandler(async (req, res) => {
  const meId = req.user.id;
  const convo = await loadMembership(req.params.id, meId);
  const myMember = convo.members.find((m) => uid(m.user) === meId);
  const now = new Date();
  myMember.unreadCount = 0;
  myMember.lastReadAt = now;
  await convo.save();

  const others = convo.members.filter((m) => uid(m.user) !== meId).map((m) => uid(m.user));
  emitToUsers(others, 'message:read', {
    conversationId: String(convo._id),
    userId: meId,
    lastReadAt: now,
  });
  res.json({ success: true, data: { lastReadAt: now } });
});

// DELETE /conversations/:id — clear the thread for the current user only.
const clearConversation = asyncHandler(async (req, res) => {
  const meId = req.user.id;
  const convo = await loadMembership(req.params.id, meId);
  const myMember = convo.members.find((m) => uid(m.user) === meId);
  myMember.clearedAt = new Date();
  myMember.unreadCount = 0;
  await convo.save();
  res.json({ success: true, message: 'Conversation cleared' });
});

// POST /conversations/:id/leave — leave a group conversation.
const leaveConversation = asyncHandler(async (req, res) => {
  const meId = req.user.id;
  const convo = await loadMembership(req.params.id, meId);
  if (!convo.isGroup) throw ApiError.badRequest('You can only leave group conversations');

  convo.members = convo.members.filter((m) => uid(m.user) !== meId);
  convo.admins = (convo.admins || []).filter((a) => String(a) !== meId);
  await convo.save();

  emitToUsers(
    convo.members.map((m) => uid(m.user)),
    'conversation:member_left',
    { conversationId: String(convo._id), userId: meId }
  );
  res.json({ success: true, message: 'Left conversation' });
});

// POST /conversations/:id/participants — add members to a group (admins only).
const addParticipants = asyncHandler(async (req, res) => {
  const meId = req.user.id;
  const convo = await loadMembership(req.params.id, meId);
  if (!convo.isGroup) throw ApiError.badRequest('Not a group conversation');
  if (!(convo.admins || []).map(String).includes(meId)) {
    throw ApiError.forbidden('Only group admins can add members');
  }

  const existing = new Set(convo.members.map((m) => uid(m.user)));
  const requested = [...new Set(req.body.userIds.map(String))].filter((id) => !existing.has(id));
  const valid = (await User.find({ _id: { $in: requested }, isBanned: false }).select('_id')).map(
    (u) => String(u._id)
  );
  valid.forEach((id) => convo.members.push({ user: id }));
  await convo.save();
  await convo.populate('members.user', USER_FIELDS);

  valid.forEach((id) =>
    emitToUser(id, 'conversation:new', { conversation: serializeConversation(convo, id) })
  );
  res.json({ success: true, data: { conversation: serializeConversation(convo, meId) } });
});

// GET /unread — total unread across all conversations (for a global badge).
const getUnreadTotal = asyncHandler(async (req, res) => {
  const meId = new mongoose.Types.ObjectId(req.user.id);
  const agg = await Conversation.aggregate([
    { $match: { 'members.user': meId } },
    { $unwind: '$members' },
    { $match: { 'members.user': meId } },
    {
      $group: {
        _id: null,
        total: { $sum: '$members.unreadCount' },
        conversations: { $sum: { $cond: [{ $gt: ['$members.unreadCount', 0] }, 1, 0] } },
      },
    },
  ]);
  res.json({
    success: true,
    data: { total: agg[0]?.total || 0, conversations: agg[0]?.conversations || 0 },
  });
});

// PATCH /messages/:id — edit your own message.
const editMessage = asyncHandler(async (req, res) => {
  const meId = req.user.id;
  const message = await Message.findById(req.params.id);
  if (!message || message.deleted) throw ApiError.notFound('Message not found');
  if (String(message.sender) !== meId) throw ApiError.forbidden('Not your message');

  message.content = req.body.content.trim();
  message.editedAt = new Date();
  await message.save();

  const convo = await Conversation.findById(message.conversation).select('members');
  const populated = await Message.findById(message._id).populate('sender', USER_FIELDS).lean();
  if (convo) {
    emitToUsers(
      convo.members.map((m) => uid(m.user)),
      'message:edited',
      { conversationId: String(message.conversation), message: populated }
    );
  }
  res.json({ success: true, data: { message: populated } });
});

// DELETE /messages/:id — soft-delete (sender, group admin, or platform admin).
const deleteMessage = asyncHandler(async (req, res) => {
  const meId = req.user.id;
  const message = await Message.findById(req.params.id);
  if (!message) throw ApiError.notFound('Message not found');

  const convo = await Conversation.findById(message.conversation).select('members admins isGroup');
  const isSender = String(message.sender) === meId;
  const isGroupAdmin = convo && convo.isGroup && (convo.admins || []).map(String).includes(meId);
  if (!isSender && !isGroupAdmin && req.user.role !== 'admin') {
    throw ApiError.forbidden('Not allowed');
  }

  const oldAttachments = (message.attachments || []).slice();
  message.deleted = true;
  message.content = '';
  message.attachments = [];
  await message.save();
  await Promise.all(oldAttachments.map((a) => deleteImage(a.publicId)));

  if (convo) {
    emitToUsers(
      convo.members.map((m) => uid(m.user)),
      'message:deleted',
      { conversationId: String(message.conversation), messageId: String(message._id) }
    );
  }
  res.json({ success: true, message: 'Message deleted' });
});

module.exports = {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  markRead,
  clearConversation,
  leaveConversation,
  addParticipants,
  getUnreadTotal,
  editMessage,
  deleteMessage,
};
