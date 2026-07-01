import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket, useChatNotifications } from '../context/SocketContext';
import { colors, spacing, radius, font } from '../theme';

function timeOf(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const socket = useSocket();
  const chatNotif = useChatNotifications();
  const myId = me?._id || me?.id;

  const { conversationId, conversation } = route.params;
  const other = conversation?.otherUser || {};
  const isGroup = Boolean(conversation?.isGroup);
  const title = isGroup ? conversation?.name || 'Group' : other.name || other.username || 'Chat';
  const headerAvatar = isGroup ? conversation?.avatar : other.avatar;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [online, setOnline] = useState(Boolean(conversation?.online));
  const typingTimeout = useRef(null);
  const typingClear = useRef(null);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [msg, ...prev]));
  }, []);

  // Keep the global chat badge in sync: this conversation is being viewed.
  useFocusEffect(
    useCallback(() => {
      chatNotif?.setActiveConversation(conversationId);
      chatNotif?.markConversationRead(conversationId);
      return () => chatNotif?.setActiveConversation(null);
    }, [conversationId, chatNotif])
  );

  // Load history + mark read.
  useEffect(() => {
    let active = true;
    api
      .get(`/chat/conversations/${conversationId}/messages`, { params: { limit: 30 } })
      .then((r) => {
        if (active) setMessages(r.data.data.messages || []);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));

    api
      .post(`/chat/conversations/${conversationId}/read`)
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [conversationId, queryClient]);

  // Socket: join room + listeners.
  useEffect(() => {
    if (!socket) return undefined;
    socket.emit('conversation:join', { conversationId });

    const onMessage = ({ conversationId: cid, message }) => {
      if (String(cid) !== String(conversationId)) return;
      addMessage(message);
      api.post(`/chat/conversations/${conversationId}/read`).catch(() => {});
    };
    const onTypingStart = ({ conversationId: cid, userId }) => {
      if (String(cid) === String(conversationId) && String(userId) !== String(myId)) {
        setOtherTyping(true);
        if (typingClear.current) clearTimeout(typingClear.current);
        typingClear.current = setTimeout(() => setOtherTyping(false), 4000);
      }
    };
    const onTypingStop = ({ conversationId: cid, userId }) => {
      if (String(cid) === String(conversationId) && String(userId) !== String(myId)) setOtherTyping(false);
    };
    const onPresence = ({ userId, online: on }) => {
      if (!isGroup && other && String(userId) === String(other._id)) setOnline(on);
    };

    socket.on('message:new', onMessage);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('presence:update', onPresence);

    return () => {
      socket.emit('conversation:leave', { conversationId });
      socket.off('message:new', onMessage);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('presence:update', onPresence);
    };
  }, [socket, conversationId, addMessage, myId, isGroup, other]);

  const onChangeText = (t) => {
    setText(t);
    if (!socket) return;
    socket.emit('typing:start', { conversationId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('typing:stop', { conversationId }), 2000);
  };

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    if (socket) socket.emit('typing:stop', { conversationId });
    try {
      const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, { content });
      addMessage(data.data.message);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (e) {
      setText(content); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const mine = String(item.sender?._id || item.sender) === String(myId);
    return (
      <View style={[s.bubbleRow, mine ? s.rowMine : s.rowTheirs]}>
        <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
          {isGroup && !mine ? <Text style={s.bubbleSender}>{item.sender?.name || item.sender?.username}</Text> : null}
          {item.content ? <Text style={[s.bubbleText, mine && { color: colors.white }]}>{item.content}</Text> : null}
          {item.attachments?.length ? <Image source={{ uri: item.attachments[0].url }} style={s.bubbleImage} /> : null}
          <Text style={[s.bubbleTime, mine && { color: 'rgba(255,255,255,0.7)' }]}>{timeOf(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.headerCenter}
          onPress={() => other.username && navigation.navigate('UserProfile', { username: other.username })}
          activeOpacity={0.7}
        >
          {headerAvatar ? (
            <Image source={{ uri: headerAvatar }} style={s.headerAvatar} />
          ) : (
            <View style={[s.headerAvatar, s.fallback]}>
              <Text style={s.headerInitial}>{(title || '?').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={s.headerTextWrap}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {otherTyping ? (
              <Text style={s.headerSubActive}>typing…</Text>
            ) : online ? (
              <Text style={s.headerSubActive}>online</Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          inverted
          style={s.list}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={[s.center, { transform: [{ scaleY: -1 }] }]}>
              <Text style={s.muted}>No messages yet. Say hi 👋</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={[s.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={onChangeText}
          placeholder="Message…"
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          onPress={send}
          disabled={!text.trim() || sending}
          style={[s.send, (!text.trim() || sending) && { opacity: 0.4 }]}
        >
          {sending ? <ActivityIndicator color={colors.white} size="small" /> : <Ionicons name="send" size={18} color={colors.white} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  list: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerAvatar: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  headerInitial: { color: colors.text, fontSize: font.sizes.sm, fontWeight: '700' },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700' },
  headerSubActive: { color: colors.success, fontSize: font.sizes.xs, marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  muted: { color: colors.textMuted, fontSize: font.sizes.md },

  bubbleRow: { marginVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surfaceAlt, borderBottomLeftRadius: 4 },
  bubbleSender: { color: colors.brand, fontSize: font.sizes.xs, fontWeight: '700', marginBottom: 2 },
  bubbleText: { color: colors.text, fontSize: font.sizes.md, lineHeight: 20 },
  bubbleImage: { width: 200, height: 200, borderRadius: radius.md, marginTop: spacing.xs, backgroundColor: colors.surface },
  bubbleTime: { color: colors.textFaint, fontSize: 10, alignSelf: 'flex-end', marginTop: 3 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    color: colors.text,
    fontSize: font.sizes.md,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
