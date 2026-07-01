import { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, Share, Modal, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
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

const REACTIONS = [
  { type: 'like', emoji: '👍' },
  { type: 'love', emoji: '❤️' },
  { type: 'fire', emoji: '🔥' },
  { type: 'laugh', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
  { type: 'applause', emoji: '👏' },
];
const EMOJI = REACTIONS.reduce((m, r) => {
  m[r.type] = r.emoji;
  return m;
}, {});

function renderContent(text, navigation) {
  const parts = text.split(/(#[A-Za-z0-9_]+)/g);
  return parts.map((part, i) => {
    if (/^#[A-Za-z0-9_]+$/.test(part)) {
      return (
        <Text
          key={i}
          style={{ color: colors.brand }}
          onPress={() => navigation.navigate('Hashtag', { tag: part.slice(1) })}
        >
          {part}
        </Text>
      );
    }
    return part;
  });
}

export default function PostCard({ post }) {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const author = post.author || {};
  const image = post.images?.[0]?.url;
  const initial = (author.name || author.username || '?').charAt(0).toUpperCase();

  const [myReaction, setMyReaction] = useState(post.myReaction || null);
  const [reactCount, setReactCount] = useState(post.reactionsCount || 0);
  const [showPicker, setShowPicker] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [saved, setSaved] = useState(Boolean(post.saved));
  const heartScale = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const singleTapTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);
  const [pinned, setPinned] = useState(Boolean(post.pinned));
  const [shareCount, setShareCount] = useState(post.sharesCount || 0);

  const isOwner =
    me && author && (String(me._id || me.id) === String(author._id) || me.username === author.username);

  const togglePin = async () => {
    try {
      const { data } = await api.post(`/posts/${post._id}/pin`);
      setPinned(data.data.pinned);
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch (e) {
      Alert.alert('Could not update', 'Please try again.');
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/posts/${post._id}`);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    } catch (e) {
      Alert.alert('Could not delete', 'Please try again.');
    }
  };

  const openMenu = () => {
    Alert.alert('Post options', undefined, [
      { text: 'Edit', onPress: () => navigation.navigate('EditPost', { post }) },
      { text: pinned ? 'Unpin from profile' : 'Pin to profile', onPress: togglePin },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete post', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: doDelete },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const sendReaction = async (type) => {
    const prev = myReaction;
    const prevCount = reactCount;
    setMyReaction(type);
    setReactCount((c) => (prev ? c : c + 1)); // count grows only when going none -> reacted
    setShowPicker(false);
    try {
      await api.post(`/posts/${post._id}/react`, { type });
    } catch (e) {
      setMyReaction(prev);
      setReactCount(prevCount);
    }
  };

  const removeReaction = async () => {
    const prev = myReaction;
    const prevCount = reactCount;
    setMyReaction(null);
    setReactCount((c) => Math.max(0, c - 1));
    try {
      await api.delete(`/posts/${post._id}/react`);
    } catch (e) {
      setMyReaction(prev);
      setReactCount(prevCount);
    }
  };

  const onPressLike = () => {
    if (showPicker) {
      setShowPicker(false);
      return;
    }
    if (myReaction) removeReaction();
    else sendReaction('love');
  };

  const popHeart = () => {
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 0, duration: 250, delay: 400, useNativeDriver: true }),
    ]).start();
  };

  const onImagePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      lastTap.current = 0;
      if (!myReaction) sendReaction('love');
      popHeart();
    } else {
      lastTap.current = now;
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(() => setViewerOpen(true), 280);
    }
  };

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.post(`/bookmarks/${post._id}`);
      else await api.delete(`/bookmarks/${post._id}`);
    } catch (e) {
      setSaved(!next);
    }
  };

  const openComments = () => navigation.navigate('Comments', { postId: post._id });
  const openProfile = () => {
    if (author.username) navigation.navigate('UserProfile', { username: author.username });
  };

  const onShare = async () => {
    try {
      const message = post.content
        ? `${post.content}\n\nShared via ConnectSphere\nhttps://connectsphereio.netlify.app`
        : 'Check out this post on ConnectSphere\nhttps://connectsphereio.netlify.app';
      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) {
        try {
          const { data } = await api.post(`/posts/${post._id}/share`);
          setShareCount(data.data.sharesCount);
        } catch (_e) {
          setShareCount((c) => c + 1);
        }
      }
    } catch (e) {
      /* share cancelled */
    }
  };

  return (
    <View style={s.card}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerMain} onPress={openProfile} activeOpacity={0.7}>
          {author.avatar ? (
            <Image source={{ uri: author.avatar }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={s.headerText}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>
                {author.name || author.username}
              </Text>
              {author.verifiedBadge ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.brand} style={{ marginLeft: 4 }} />
              ) : null}
              {pinned ? <Ionicons name="pin" size={12} color={colors.textFaint} style={{ marginLeft: 4 }} /> : null}
            </View>
            <Text style={s.handle} numberOfLines={1}>
              @{author.username} · {timeAgo(post.createdAt)}
              {post.editedAt ? ' · edited' : ''}
            </Text>
          </View>
        </TouchableOpacity>
        {isOwner ? (
          <TouchableOpacity onPress={openMenu} hitSlop={8} style={s.menuBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {post.content ? <Text style={s.content}>{renderContent(post.content, navigation)}</Text> : null}

      {image ? (
        <View style={s.imageWrap}>
          <Pressable onPress={onImagePress}>
            <Image source={{ uri: image }} style={s.image} resizeMode="cover" />
          </Pressable>
          <Animated.View
            pointerEvents="none"
            style={[s.heartOverlay, { opacity: heartScale, transform: [{ scale: heartScale }] }]}
          >
            <Ionicons name="heart" size={90} color="#fff" />
          </Animated.View>
        </View>
      ) : null}

      {showPicker ? (
        <>
          <Pressable style={s.pickerBackdrop} onPress={() => setShowPicker(false)} />
          <View style={s.picker}>
            {REACTIONS.map((r) => (
              <TouchableOpacity key={r.type} onPress={() => sendReaction(r.type)} style={s.pickerItem} hitSlop={4}>
                <Text style={s.pickerEmoji}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      <View style={s.actions}>
        <TouchableOpacity
          style={s.action}
          onPress={onPressLike}
          onLongPress={() => setShowPicker(true)}
          delayLongPress={220}
          hitSlop={6}
        >
          {myReaction ? (
            myReaction === 'love' ? (
              <Ionicons name="heart" size={20} color={colors.coral} />
            ) : (
              <Text style={s.reactEmoji}>{EMOJI[myReaction]}</Text>
            )
          ) : (
            <Ionicons name="heart-outline" size={20} color={colors.textMuted} />
          )}
          <Text style={[s.actionText, myReaction && { color: colors.coral }]}>{reactCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.action} onPress={openComments} hitSlop={6}>
          <Ionicons name="chatbubble-outline" size={19} color={colors.textMuted} />
          <Text style={s.actionText}>{post.commentsCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.action} onPress={onShare} hitSlop={6}>
          <Ionicons name="arrow-redo-outline" size={19} color={colors.textMuted} />
          <Text style={s.actionText}>{shareCount || 0}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity onPress={toggleSave} hitSlop={6}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={19} color={saved ? colors.brand : colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <Pressable style={s.viewerBackdrop} onPress={() => setViewerOpen(false)}>
          {image ? <Image source={{ uri: image }} style={s.viewerImage} resizeMode="contain" /> : null}
          <TouchableOpacity style={s.viewerClose} onPress={() => setViewerOpen(false)} hitSlop={10}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  reactEmoji: { fontSize: 18 },
  imageWrap: { position: 'relative' },
  heartOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pickerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  picker: {
    position: 'absolute',
    bottom: 46,
    left: spacing.lg,
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 11,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pickerItem: { paddingHorizontal: 6, paddingVertical: 2 },
  pickerEmoji: { fontSize: 28 },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '82%' },
  viewerClose: { position: 'absolute', top: 48, right: 20 },
  headerMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  menuBtn: { paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  avatar: { width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700' },
  headerText: { flex: 1, marginLeft: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700', flexShrink: 1 },
  handle: { color: colors.textFaint, fontSize: font.sizes.sm, marginTop: 1 },
  content: { color: colors.text, fontSize: font.sizes.md, lineHeight: 21, marginTop: spacing.md },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  actions: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.xl },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { color: colors.textMuted, fontSize: font.sizes.sm },
});
