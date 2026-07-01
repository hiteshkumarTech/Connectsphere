import { useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { colors, spacing, radius, font } from '../theme';
import PostCard from '../components/PostCard';

async function fetchFeed(page) {
  const { data } = await api.get('/posts/feed', { params: { page, limit: 10 } });
  return data.data; // { posts, pagination }
}

export default function FeedScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => fetchFeed(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination?.hasMore ? last.pagination.page + 1 : undefined),
  });

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];
  const renderItem = useCallback(({ item }) => <PostCard post={item} />, []);

  const fab = (
    <TouchableOpacity
      style={[s.fab, { bottom: insets.bottom + spacing.lg }]}
      onPress={() => navigation.navigate('CreatePost')}
      activeOpacity={0.85}
    >
      <Ionicons name="add" size={30} color={colors.white} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={s.fill}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
        {fab}
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.fill}>
        <View style={s.center}>
          <Text style={s.muted}>Couldn't load the feed.</Text>
          <Text style={s.mutedSmall}>Pull down to retry.</Text>
        </View>
        {fab}
      </View>
    );
  }

  return (
    <View style={s.fill}>
      <FlatList
        style={s.list}
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} colors={[colors.brand]} />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator color={colors.brand} style={{ marginVertical: spacing.xl }} /> : null
        }
        ListEmptyComponent={
          <View style={s.center}>
            <Text style={s.muted}>Your feed is empty.</Text>
            <Text style={s.mutedSmall}>Tap + to share your first post, or follow people to see theirs.</Text>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? s.emptyContainer : { paddingBottom: 90 }}
      />
      {fab}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  list: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyContainer: { flexGrow: 1 },
  muted: { color: colors.textMuted, fontSize: font.sizes.md, fontWeight: '600' },
  mutedSmall: { color: colors.textFaint, fontSize: font.sizes.sm, marginTop: spacing.xs, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
