import { useEffect } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { colors, spacing, radius, font } from '../theme';

function timeAgo(date) {
  if (!date) return '';
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(date).toLocaleDateString();
}

export default function ChatListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const socket = useSocket();
  const myId = me?._id || me?.id;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get('/chat/conversations', { params: { limit: 50 } });
      return res.data.data.conversations || [];
    },
  });
  const conversations = data || [];

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['conversations'] });
    socket.on('message:new', refresh);
    socket.on('conversation:new', refresh);
    socket.on('message:read', refresh);
    return () => {
      socket.off('message:new', refresh);
      socket.off('conversation:new', refresh);
      socket.off('message:read', refresh);
    };
  }, [socket, queryClient]);

  const renderItem = ({ item }) => {
    const other = item.otherUser || {};
    const title = item.isGroup ? item.name || 'Group' : other.name || other.username || 'User';
    const avatar = item.isGroup ? item.avatar : other.avatar;
    const initial = (title || '?').charAt(0).toUpperCase();
    const last = item.lastMessage;
    const lastText = last ? last.content || (last.type === 'image' ? '📷 Photo' : '') : 'Say hi 👋';
    const mine = last && String(last.sender?._id || last.sender) === String(myId);
    const unread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={s.row}
        onPress={() => navigation.navigate('Chat', { conversationId: item._id, conversation: item })}
        activeOpacity={0.7}
      >
        <View style={s.avatarWrap}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.fallback]}>
              <Text style={s.initial}>{initial}</Text>
            </View>
          )}
          {item.online ? <View style={s.onlineDot} /> : null}
        </View>
        <View style={s.body}>
          <Text style={s.name} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[s.preview, unread && s.previewUnread]} numberOfLines={1}>
            {mine ? 'You: ' : ''}
            {lastText}
          </Text>
        </View>
        <View style={s.right}>
          <Text style={s.time}>{timeAgo(item.lastMessageAt)}</Text>
          {unread ? (
            <View style={s.badge}>
              <Text style={s.badgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.fill}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Messages</Text>
        <View style={{ width: 26 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} colors={[colors.brand]} />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="chatbubbles-outline" size={42} color={colors.textFaint} />
              <Text style={s.muted}>No conversations yet</Text>
              <Text style={s.mutedSmall}>Open someone's profile and tap Message to start chatting.</Text>
            </View>
          }
          contentContainerStyle={conversations.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + spacing.xl }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  muted: { color: colors.textMuted, fontSize: font.sizes.md, fontWeight: '600', marginTop: spacing.md },
  mutedSmall: { color: colors.textFaint, fontSize: font.sizes.sm, marginTop: spacing.xs, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.text, fontSize: font.sizes.lg, fontWeight: '700' },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  body: { flex: 1 },
  name: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700' },
  preview: { color: colors.textMuted, fontSize: font.sizes.sm, marginTop: 2 },
  previewUnread: { color: colors.text, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  time: { color: colors.textFaint, fontSize: font.sizes.xs },
  badge: { minWidth: 20, height: 20, borderRadius: radius.full, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
});
