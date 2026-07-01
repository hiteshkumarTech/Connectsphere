import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, font } from '../theme';
import PostCard from '../components/PostCard';

const { width } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_SIZE = (width - GRID_GAP * 2) / 3;
const COVER_HEIGHT = 180;

function Pulse({ style }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ backgroundColor: colors.surfaceAlt, opacity }, style]} />;
}

function ProfileSkeleton({ insets }) {
  return (
    <View style={s.fill}>
      <Pulse style={{ height: COVER_HEIGHT, borderRadius: 0 }} />
      <View style={s.infoWrap}>
        <Pulse style={{ width: 92, height: 92, borderRadius: radius.full, marginTop: -46 }} />
        <Pulse style={{ width: 160, height: 22, borderRadius: 6, marginTop: spacing.md }} />
        <Pulse style={{ width: 110, height: 14, borderRadius: 6, marginTop: spacing.sm }} />
        <Pulse style={{ width: '100%', height: 60, borderRadius: radius.lg, marginTop: spacing.xl }} />
      </View>
    </View>
  );
}

function TabBtn({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity style={s.tabBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={active ? colors.brand : colors.textFaint} />
      <Text style={[s.tabText, active && { color: colors.brand }]}>{label}</Text>
      {active ? <View style={s.tabUnderline} /> : null}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user: me, logout } = useAuth();

  const username = route.params?.username || me?.username;
  const [activeTab, setActiveTab] = useState('posts');

  const profileQ = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await api.get(`/users/${username}`);
      return data.data; // { user, isMe, isFollowing, isPrivate }
    },
    enabled: Boolean(username),
  });

  const postsQ = useInfiniteQuery({
    queryKey: ['userPosts', username],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get(`/posts/user/${username}`, { params: { page: pageParam, limit: 12 } });
      return data.data; // { posts, pagination }
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination?.hasMore ? last.pagination.page + 1 : undefined),
    enabled: Boolean(username),
  });

  const profile = profileQ.data;
  const user = profile?.user;
  const isMe = profile?.isMe;
  const posts = postsQ.data?.pages.flatMap((p) => p.posts) ?? [];
  const mediaImages = posts.flatMap((p) =>
    (p.images || []).map((img, i) => ({ id: `${p._id}_${i}`, url: img.url }))
  );

  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  useEffect(() => {
    if (profile) {
      setIsFollowing(Boolean(profile.isFollowing));
      setFollowersCount(profile.user.followersCount || 0);
    }
  }, [profile]);

  const toggleFollow = async () => {
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowersCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      if (next) await api.post(`/users/${username}/follow`);
      else await api.delete(`/users/${username}/follow`);
    } catch (e) {
      setIsFollowing(!next);
      setFollowersCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  };

  const startChat = async () => {
    try {
      const { data } = await api.post('/chat/conversations', { userId: user._id });
      navigation.navigate('Chat', { conversationId: data.data.conversation._id, conversation: data.data.conversation });
    } catch (e) {
      Alert.alert('Could not open chat', 'Please try again.');
    }
  };

  const onRefresh = useCallback(() => {
    profileQ.refetch();
    postsQ.refetch();
  }, [profileQ, postsQ]);

  const openWebsite = () => {
    if (!user?.website) return;
    const url = user.website.startsWith('http') ? user.website : `https://${user.website}`;
    Linking.openURL(url).catch(() => {});
  };

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (user) Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [user, fade]);

  if (profileQ.isLoading) return <ProfileSkeleton insets={insets} />;
  if (profileQ.isError || !user) {
    return (
      <View style={[s.fill, s.center]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textFaint} />
        <Text style={s.muted}>Couldn't load this profile.</Text>
        <TouchableOpacity onPress={() => profileQ.refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initial = (user.name || user.username || '?').charAt(0).toUpperCase();

  const Header = (
    <Animated.View style={{ opacity: fade }}>
      <View style={s.coverWrap}>
        {user.coverPhoto ? (
          <Image source={{ uri: user.coverPhoto }} style={s.cover} />
        ) : (
          <View style={[s.cover, s.coverFallback]} />
        )}
        <View style={s.coverScrim} />

        <View style={[s.topBar, { paddingTop: insets.top + spacing.xs }]}>
          {navigation.canGoBack() ? (
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
          {isMe ? (
            <View style={s.topBarRight}>
              <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Saved')} hitSlop={8}>
                <Ionicons name="bookmark-outline" size={20} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Settings')} hitSlop={8}>
                <Ionicons name="settings-outline" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {isMe ? (
          <TouchableOpacity style={s.coverEdit} onPress={() => navigation.navigate('EditProfile')} hitSlop={8}>
            <Ionicons name="camera" size={15} color={colors.white} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.infoWrap}>
        <View style={s.avatarRow}>
          <View>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInitial}>{initial}</Text>
              </View>
            )}
            {isMe ? (
              <TouchableOpacity style={s.avatarEdit} onPress={() => navigation.navigate('EditProfile')} hitSlop={6}>
                <Ionicons name="camera" size={12} color={colors.white} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={s.actionWrap}>
            {isMe ? (
              <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.85}>
                <Text style={s.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.actionRow}>
                <TouchableOpacity style={s.msgBtn} onPress={startChat} activeOpacity={0.85}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
                  <Text style={s.msgBtnText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.followBtn, isFollowing && s.followingBtn]}
                  onPress={toggleFollow}
                  activeOpacity={0.85}
                >
                  <Text style={[s.followBtnText, isFollowing && s.followingBtnText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={s.nameRow}>
          <Text style={s.name}>{user.name}</Text>
          {user.verifiedBadge ? (
            <Ionicons name="checkmark-circle" size={18} color={colors.brand} style={{ marginLeft: 6 }} />
          ) : null}
        </View>
        <Text style={s.handle}>@{user.username}</Text>

        {user.bio ? <Text style={s.bio}>{user.bio}</Text> : null}

        {(user.location || user.website) && (
          <View style={s.metaRow}>
            {user.location ? (
              <View style={s.metaItem}>
                <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                <Text style={s.metaText}>{user.location}</Text>
              </View>
            ) : null}
            {user.website ? (
              <TouchableOpacity style={s.metaItem} onPress={openWebsite}>
                <Ionicons name="link-outline" size={15} color={colors.brand} />
                <Text style={[s.metaText, { color: colors.brand }]} numberOfLines={1}>
                  {user.website.replace(/^https?:\/\//, '')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={s.statVal}>{user.postsCount ?? posts.length ?? 0}</Text>
            <Text style={s.statLabel}>Posts</Text>
          </View>
          <View style={s.statDivider} />
          <TouchableOpacity
            style={s.stat}
            onPress={() => navigation.navigate('FollowList', { username: user.username, initialTab: 'followers' })}
            activeOpacity={0.7}
          >
            <Text style={s.statVal}>{followersCount}</Text>
            <Text style={s.statLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity
            style={s.stat}
            onPress={() => navigation.navigate('FollowList', { username: user.username, initialTab: 'following' })}
            activeOpacity={0.7}
          >
            <Text style={s.statVal}>{user.followingCount ?? 0}</Text>
            <Text style={s.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {isMe && !user.emailVerified ? (
          <View style={s.verifyNote}>
            <Ionicons name="mail-unread-outline" size={14} color={colors.coral} />
            <Text style={s.verifyText}>Verify your email from the link we sent you.</Text>
          </View>
        ) : null}
      </View>

      <View style={s.tabs}>
        <TabBtn label="Posts" icon="grid-outline" active={activeTab === 'posts'} onPress={() => setActiveTab('posts')} />
        <TabBtn label="Media" icon="images-outline" active={activeTab === 'media'} onPress={() => setActiveTab('media')} />
      </View>
    </Animated.View>
  );

  const renderPost = ({ item }) => (
    <View>
      {item.pinned ? (
        <View style={s.pinnedTag}>
          <Ionicons name="pin" size={12} color={colors.brand} />
          <Text style={s.pinnedText}>Pinned</Text>
        </View>
      ) : null}
      <PostCard post={item} />
    </View>
  );

  const renderMedia = ({ item }) => <Image source={{ uri: item.url }} style={s.gridCell} />;

  return (
    <View style={s.fill}>
      <FlatList
        key={activeTab}
        data={activeTab === 'posts' ? posts : mediaImages}
        numColumns={activeTab === 'media' ? 3 : 1}
        keyExtractor={(item) => (activeTab === 'media' ? item.id : item._id)}
        ListHeaderComponent={Header}
        renderItem={activeTab === 'posts' ? renderPost : renderMedia}
        columnWrapperStyle={activeTab === 'media' ? { gap: GRID_GAP } : undefined}
        ItemSeparatorComponent={activeTab === 'media' ? () => <View style={{ height: GRID_GAP }} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={profileQ.isRefetching || postsQ.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        onEndReached={() => {
          if (postsQ.hasNextPage && !postsQ.isFetchingNextPage) postsQ.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          postsQ.isFetchingNextPage ? <ActivityIndicator color={colors.brand} style={{ margin: spacing.xl }} /> : null
        }
        ListEmptyComponent={
          postsQ.isLoading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xxl }} />
          ) : (
            <View style={s.emptyTab}>
              <Ionicons
                name={activeTab === 'media' ? 'images-outline' : 'document-text-outline'}
                size={40}
                color={colors.textFaint}
              />
              <Text style={s.muted}>{activeTab === 'media' ? 'No media yet' : 'No posts yet'}</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  muted: { color: colors.textMuted, fontSize: font.sizes.md, fontWeight: '600', marginTop: spacing.md },
  retryBtn: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.brand },
  retryText: { color: colors.white, fontWeight: '700' },

  coverWrap: { height: COVER_HEIGHT, backgroundColor: colors.surfaceAlt },
  cover: { width: '100%', height: COVER_HEIGHT },
  coverFallback: { backgroundColor: colors.brandSoft },
  coverScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarRight: { flexDirection: 'row', gap: spacing.sm },
  coverEdit: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoWrap: { paddingHorizontal: spacing.lg },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: radius.full,
    marginTop: -46,
    borderWidth: 4,
    borderColor: colors.bg,
    backgroundColor: colors.surfaceAlt,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.text, fontSize: 34, fontWeight: '800' },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionWrap: { paddingBottom: spacing.sm },
  editBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  editBtnText: { color: colors.text, fontWeight: '700', fontSize: font.sizes.sm },
  followBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.brand },
  followBtnText: { color: colors.white, fontWeight: '700', fontSize: font.sizes.sm },
  followingBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border },
  followingBtnText: { color: colors.text },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  msgBtnText: { color: colors.text, fontWeight: '700', fontSize: font.sizes.sm },

  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  name: { color: colors.text, fontSize: font.sizes.xl, fontWeight: '800' },
  handle: { color: colors.textMuted, fontSize: font.sizes.md, marginTop: 1 },
  bio: { color: colors.text, fontSize: font.sizes.md, lineHeight: 21, marginTop: spacing.md },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: width * 0.6 },
  metaText: { color: colors.textMuted, fontSize: font.sizes.sm },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statVal: { color: colors.text, fontSize: font.sizes.lg, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: font.sizes.xs, marginTop: 2 },

  verifyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(251,113,133,0.10)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  verifyText: { color: colors.coral, fontSize: font.sizes.sm, flex: 1 },

  tabs: { flexDirection: 'row', marginTop: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  tabText: { color: colors.textFaint, fontSize: font.sizes.sm, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    width: '60%',
    backgroundColor: colors.brand,
    borderRadius: 2,
  },

  pinnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  pinnedText: { color: colors.brand, fontSize: font.sizes.xs, fontWeight: '700' },

  gridCell: { width: GRID_SIZE, height: GRID_SIZE, backgroundColor: colors.surfaceAlt },
  emptyTab: { alignItems: 'center', paddingTop: spacing.xxl },
});
