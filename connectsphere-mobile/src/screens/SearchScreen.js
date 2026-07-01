import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../api/client';
import { colors, spacing, radius, font } from '../theme';
import UserRow from '../components/UserRow';
import PostCard from '../components/PostCard';

function TabBtn({ label, count, active, onPress }) {
  return (
    <TouchableOpacity style={s.tabBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={[s.tabText, active && { color: colors.brand }]}>
        {label}
        {count ? ` (${count})` : ''}
      </Text>
      {active ? <View style={s.tabUnderline} /> : null}
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('people'); // 'people' | 'posts'
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  // Explore data (shown when the search box is empty).
  const [trendingTags, setTrendingTags] = useState([]);
  const [explorePosts, setExplorePosts] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(true);

  const isSearching = query.trim().length > 0;

  // Load explore content once.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [t, e] = await Promise.all([
          api.get('/posts/hashtags/trending'),
          api.get('/posts/explore', { params: { limit: 20 } }),
        ]);
        if (!active) return;
        setTrendingTags(t.data.data.hashtags || []);
        setExplorePosts(e.data.data.posts || []);
      } catch (_e) {
        // ignore — explore is best-effort
      } finally {
        if (active) setExploreLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Debounced search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setUsers([]);
      setPosts([]);
      setSearched(false);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [u, p] = await Promise.all([
          api.get('/users/search', { params: { q } }),
          api.get('/posts/search', { params: { q } }),
        ]);
        setUsers(u.data.data.users || []);
        setPosts(p.data.data.posts || []);
        setSearched(true);
      } catch (e) {
        setUsers([]);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query]);

  const data = tab === 'people' ? users : posts;

  const ExploreHeader = (
    <View>
      {trendingTags.length > 0 ? (
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Ionicons name="trending-up" size={18} color={colors.brand} />
            <Text style={s.sectionTitle}>Trending tags</Text>
          </View>
          <View style={s.tagWrap}>
            {trendingTags.map((h) => (
              <TouchableOpacity
                key={h.tag}
                style={s.tagPill}
                onPress={() => navigation.navigate('Hashtag', { tag: h.tag })}
                activeOpacity={0.7}
              >
                <Text style={s.tagHash}>#</Text>
                <Text style={s.tagText}>{h.tag}</Text>
                {h.count ? <Text style={s.tagCount}>{h.count}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View style={s.section}>
        <Text style={s.bigTitle}>Trending posts</Text>
        <Text style={s.subtitle}>Popular right now across ConnectSphere.</Text>
      </View>
    </View>
  );

  return (
    <View style={[s.fill, { paddingTop: insets.top + spacing.sm }]}>
      <View style={s.searchBar}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search people, posts, and tags"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isSearching ? (
        <>
          <View style={s.tabs}>
            <TabBtn label="People" count={users.length} active={tab === 'people'} onPress={() => setTab('people')} />
            <TabBtn label="Posts" count={posts.length} active={tab === 'posts'} onPress={() => setTab('posts')} />
          </View>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : (
            <FlatList
              key={tab}
              data={data}
              keyExtractor={(item) => item._id || item.username}
              renderItem={tab === 'people' ? ({ item }) => <UserRow user={item} /> : ({ item }) => <PostCard post={item} />}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
              ListEmptyComponent={
                searched ? (
                  <View style={s.center}>
                    <Text style={s.muted}>No {tab} found for “{query.trim()}”.</Text>
                  </View>
                ) : null
              }
              contentContainerStyle={data.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + spacing.xl }}
            />
          )}
        </>
      ) : exploreLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={explorePosts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <PostCard post={item} />}
          ListHeaderComponent={ExploreHeader}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          ListEmptyComponent={
            <View style={s.centerPad}>
              <Ionicons name="compass-outline" size={42} color={colors.textFaint} />
              <Text style={s.muted}>Nothing to explore yet. Be the first to post!</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontSize: font.sizes.md, padding: 0 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  tabText: { color: colors.textFaint, fontSize: font.sizes.sm, fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: -1, height: 2, width: '50%', backgroundColor: colors.brand, borderRadius: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  centerPad: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, paddingTop: spacing.xl * 2 },
  muted: { color: colors.textMuted, fontSize: font.sizes.md, marginTop: spacing.md, textAlign: 'center' },

  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: font.sizes.md, fontWeight: '800' },
  bigTitle: { color: colors.text, fontSize: font.sizes.lg, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: font.sizes.sm, marginTop: 2, marginBottom: spacing.sm },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagHash: { color: colors.brand, fontWeight: '800', fontSize: font.sizes.sm },
  tagText: { color: colors.text, fontWeight: '700', fontSize: font.sizes.sm },
  tagCount: { color: colors.textFaint, fontSize: font.sizes.xs, marginLeft: 2 },
});
