import { useEffect } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { colors, spacing, radius, font } from '../theme';

function timeAgo(date) {
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

const TYPE_META = {
  follow: { icon: 'person-add', color: colors.brand },
  reaction: { icon: 'heart', color: colors.coral },
  comment: { icon: 'chatbubble', color: colors.brand },
  reply: { icon: 'chatbubble-ellipses', color: colors.brand },
  mention: { icon: 'at', color: colors.brand },
};

function messageFor(n) {
  const name = n.sender?.name || n.sender?.username || 'Someone';
  switch (n.type) {
    case 'follow':
      return `${name} started following you`;
    case 'reaction':
      return `${name} ${n.reactionType === 'like' ? 'liked' : 'reacted to'} your post`;
    case 'comment':
      return `${name} commented on your post`;
    case 'reply':
      return `${name} replied to your comment`;
    case 'mention':
      return `${name} mentioned you`;
    default:
      return `${name} interacted with you`;
  }
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const q = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get('/notifications', { params: { page: pageParam, limit: 20 } });
      return data.data; // { notifications, unreadCount, pagination }
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination?.hasMore ? last.pagination.page + 1 : undefined),
  });

  // Opening the screen marks everything read and clears the header badge.
  useEffect(() => {
    api
      .post('/notifications/read-all')
      .then(() => queryClient.invalidateQueries({ queryKey: ['unreadCount'] }))
      .catch(() => {});
  }, [queryClient]);

  const items = q.data?.pages.flatMap((p) => p.notifications) ?? [];

  const onPressItem = (n) => {
    if (n.type === 'follow') {
      if (n.sender?.username) navigation.navigate('UserProfile', { username: n.sender.username });
      return;
    }
    const postId = n.post?._id || n.post;
    if (postId) {
      navigation.navigate('Comments', { postId });
    } else if (n.sender?.username) {
      navigation.navigate('UserProfile', { username: n.sender.username });
    }
  };

  const renderItem = ({ item }) => {
    const meta = TYPE_META[item.type] || TYPE_META.reaction;
    const sender = item.sender || {};
    const initial = (sender.name || sender.username || '?').charAt(0).toUpperCase();
    const thumb = item.post?.images?.[0]?.url;
    return (
      <TouchableOpacity style={[s.item, !item.read && s.unread]} onPress={() => onPressItem(item)} activeOpacity={0.7}>
        <View style={s.avatarWrap}>
          {sender.avatar ? (
            <Image source={{ uri: sender.avatar }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.fallback]}>
              <Text style={s.initial}>{initial}</Text>
            </View>
          )}
          <View style={[s.iconBadge, { backgroundColor: meta.color }]}>
            <Ionicons name={meta.icon} size={11} color={colors.white} />
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.message} numberOfLines={2}>
            {messageFor(item)}
          </Text>
          <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
        </View>

        {thumb ? <Image source={{ uri: thumb }} style={s.thumb} /> : null}
        {!item.read ? <View style={s.dot} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.fill}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <View style={{ width: 26 }} />
      </View>

      {q.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.brand} colors={[colors.brand]} />
          }
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            q.isFetchingNextPage ? <ActivityIndicator color={colors.brand} style={{ margin: spacing.xl }} /> : null
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="notifications-outline" size={42} color={colors.textFaint} />
              <Text style={s.muted}>No notifications yet</Text>
              <Text style={s.mutedSmall}>Likes, comments and new followers will show up here.</Text>
            </View>
          }
          contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + spacing.xl }}
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

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unread: { backgroundColor: 'rgba(99,102,241,0.07)' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 46, height: 46, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700' },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  message: { color: colors.text, fontSize: font.sizes.sm, lineHeight: 19 },
  time: { color: colors.textFaint, fontSize: font.sizes.xs, marginTop: 2 },
  thumb: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
});
