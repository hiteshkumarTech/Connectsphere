const { Server } = require('socket.io');
const config = require('../config');
const { verifyAccessToken } = require('../utils/token');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

let io = null;
// userId -> Set of active socket ids (supports multiple tabs/devices).
const online = new Map();

const room = (userId) => `user:${String(userId)}`;
const convoRoom = (conversationId) => `conversation:${String(conversationId)}`;

function init(server) {
  io = new Server(server, {
    cors: { origin: config.clientUrl, credentials: true },
  });

  // Authenticate every socket connection using the access token.
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || '').replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub).select('username');
      if (!user) return next(new Error('User not found'));
      socket.user = { id: user.id, username: user.username };
      next();
    } catch (_e) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(room(userId));

    // --- presence ---
    const set = online.get(userId) || new Set();
    const wasOffline = set.size === 0;
    set.add(socket.id);
    online.set(userId, set);
    if (wasOffline) io.emit('presence:update', { userId, online: true });

    // --- chat: join a conversation room (verified) so typing/read events are cheap ---
    socket.on('conversation:join', async ({ conversationId } = {}, ack) => {
      try {
        if (!conversationId) return;
        const isMember = await Conversation.exists({
          _id: conversationId,
          'members.user': userId,
        });
        if (isMember) {
          socket.join(convoRoom(conversationId));
          if (typeof ack === 'function') ack({ ok: true });
        } else if (typeof ack === 'function') {
          ack({ ok: false });
        }
      } catch (_e) {
        if (typeof ack === 'function') ack({ ok: false });
      }
    });

    socket.on('conversation:leave', ({ conversationId } = {}) => {
      if (conversationId) socket.leave(convoRoom(conversationId));
    });

    // --- chat: typing indicators (ephemeral, relayed only to the active room) ---
    const relayTyping = (event) => ({ conversationId } = {}) => {
      if (!conversationId || !socket.rooms.has(convoRoom(conversationId))) return;
      socket.to(convoRoom(conversationId)).emit(event, {
        conversationId,
        userId,
        username: socket.user.username,
      });
    };
    socket.on('typing:start', relayTyping('typing:start'));
    socket.on('typing:stop', relayTyping('typing:stop'));

    // --- disconnect cleanup ---
    socket.on('disconnect', async () => {
      const s = online.get(userId);
      if (s) {
        s.delete(socket.id);
        if (s.size === 0) {
          online.delete(userId);
          io.emit('presence:update', { userId, online: false });
          await User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});
        }
      }
    });
  });

  console.log('[socket] Socket.IO initialized');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

function emitToUser(userId, event, payload) {
  if (io) io.to(room(userId)).emit(event, payload);
}

function emitToUsers(userIds = [], event, payload) {
  if (!io) return;
  userIds.forEach((id) => io.to(room(id)).emit(event, payload));
}

function emitToConversation(conversationId, event, payload) {
  if (io) io.to(convoRoom(conversationId)).emit(event, payload);
}

const isOnline = (userId) => online.has(String(userId));
const onlineUserIds = () => Array.from(online.keys());

module.exports = {
  init,
  getIO,
  emitToUser,
  emitToUsers,
  emitToConversation,
  isOnline,
  onlineUserIds,
};
