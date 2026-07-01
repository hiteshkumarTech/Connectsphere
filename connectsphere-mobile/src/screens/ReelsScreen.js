import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVideoPlayer, VideoView } from 'expo-video';
import api from '../api/client';
import { colors, spacing, radius, font } from '../theme';

function ReelItem({ post, isActive, muted, onToggleMute, onOpenComments, onOpenProfile, height }) {
  const author = post.author || {};
  const player = useVideoPlayer(post.video?.url ? { uri: post.video.url } : null, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  const [myReaction, setMyReaction] = useState(post.myReaction || null);
  const [reactCount, setReactCount] = useState(post.reactionsCount || 0);
  const liked = Boolean(myReaction);

  // Play only the focused, on-screen reel.
  useEffect(() => {
    try {
      if (isActive) player.play();
      else player.pause();
    } catch (e) {
      /* no-op */
    }
  }, [isActive, player]);

  useEffect(() => {
    try {
      player.muted = muted;
    } catch (e) {
      /* no-op */
    }
  }, [muted, player]);

  const toggleLike = async () => {
    const wasLiked = liked;
    setMyReaction(wasLiked ? null : 'love');
    setReactCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));
    try {
      if (wasLiked) await api.delete(`/posts/${post._id}/react`);
      else await api.post(`/posts/${post._id}/react`, { type: 'love' });
    } catch (e) {
      setMyReaction(wasLiked ? 'love' : null);
      setReactCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `${post.content || 'Check out this reel on ConnectSphere'}\nhttps://connectsphereio.netlify.app`,
      });
      api.post(`/posts/${post._id}/share`).catch(() => {});
    } catch (e) {
      /* cancelled */
    }
  };

  const initial = (author.name || author.username || '?').charAt(0).toUpperCase();

  return (
    <View style={{ height, width: '100%', backgroundColor: '#000' }}>
      {post.video?.thumbnail ? (
        <Image source={{ uri: post.video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        surfaceType="textureView"
      />
      {/* tap anywhere to mute/unmute */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onToggleMute} />

      {/* right action rail */}
      <View style={[s.actionsCol, { bottom: spacing.xl + 8 }]}>
        <TouchableOpacity style={s.actionBtn} onPress={toggleLike} hitSlop={6}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={34} color={liked ? colors.coral : '#fff'} />
          <Text style={s.actionCount}>{reactCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => onOpenComments(post._id)} hitSlop={6}>
          <Ionicons name="chatbubble-outline" size={31} color="#fff" />
          <Text style={s.actionCount}>{post.commentsCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={onShare} hitSlop={6}>
          <Ionicons name="arrow-redo-outline" size={31} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={onToggleMute} hitSlop={6}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={27} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* bottom author + caption */}
      <View style={[s.bottomInfo, { bottom: spacing.xl }]}>
        <TouchableOpacity style={s.authorRow} onPress={() => onOpenProfile(author.username)} activeOpacity={0.8}>
          {author.avatar ? (
            <Image source={{ uri: author.avatar }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarInitial}>{initial}</Text>
            </View>
          )}
          <Text style={s.authorName}>@{author.username}</Text>
          {author.verifiedBadge ? (
            <Ionicons name="checkmark-circle" size={15} color={colors.brand} style={{ marginLeft: 4 }} />
          ) : null}
        </TouchableOpacity>
        {post.content ? (
          <Text style={s.caption} numberOfLines={2}>
            {post.content}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [containerH, setContainerH] = useState(0);

  const q = useInfiniteQuery({
    queryKey: ['reels'],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get('/posts/reels', { params: { page: pageParam, limit: 8 } });
      return data.data; // { posts, pagination }
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination?.hasMore ? last.pagination.page + 1 : undefined),
  });
  const reels = q.data?.pages.flatMap((p) => p.posts) ?? [];

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) setActiveIndex(viewableItems[0].index);
  });
  const viewConfigRef = useRef({ itemVisiblePercentThreshold: 80 });

  const openComments = (postId) => navigation.navigate('Comments', { postId });
  const openProfile = (username) => username && navigation.navigate('UserProfile', { username });

  return (
    <View style={s.fill} onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}>
      {q.isLoading || containerH === 0 ? (
        <View style={s.center}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : reels.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="film-outline" size={54} color="#555" />
          <Text style={s.emptyText}>No reels yet</Text>
          <TouchableOpacity style={s.createFirst} onPress={() => navigation.navigate('CreateReel')} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.createFirstText}>Create the first reel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reels}
          style={s.fill}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <ReelItem
              post={item}
              isActive={index === activeIndex && isFocused}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onOpenComments={openComments}
              onOpenProfile={openProfile}
              height={containerH}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: containerH, offset: containerH * index, index })}
          onViewableItemsChanged={onViewRef.current}
          viewabilityConfig={viewConfigRef.current}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          onEndReachedThreshold={0.6}
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={1}
          removeClippedSubviews
        />
      )}

      {/* top overlay */}
      <View style={[s.topBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Text style={s.topTitle}>Reels</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateReel')} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: spacing.xl },
  emptyText: { color: '#999', fontSize: font.sizes.lg, fontWeight: '600', marginTop: spacing.md },
  createFirst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  createFirstText: { color: '#fff', fontWeight: '700', fontSize: font.sizes.md },
  topBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  actionsCol: { position: 'absolute', right: spacing.md, alignItems: 'center', gap: spacing.lg },
  actionBtn: { alignItems: 'center', gap: 3 },
  actionCount: { color: '#fff', fontSize: font.sizes.xs, fontWeight: '700' },
  bottomInfo: { position: 'absolute', left: spacing.lg, right: 80 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#fff' },
  avatarFallback: { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: font.sizes.sm },
  authorName: { color: '#fff', fontWeight: '800', fontSize: font.sizes.md, marginLeft: spacing.sm, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 5 },
  caption: { color: '#eee', fontSize: font.sizes.sm, lineHeight: 19, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 5 },
});
