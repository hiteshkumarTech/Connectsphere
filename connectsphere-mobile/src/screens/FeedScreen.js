import { useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';
import { colors, spacing, font } from '../theme';
import PostCard from '../components/PostCard';

async function fetchFeed(page) {
  const { data } = await api.get('/posts/feed', { params: { page, limit: 10 } });
  return data.data; // { posts, pagination }
}

export default function FeedScreen() {
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

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Couldn't load the feed.</Text>
        <Text style={s.mutedSmall}>Pull down to retry.</Text>
      </View>
    );
  }

  return (
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
          <Text style={s.mutedSmall}>Follow people on the web app to see their posts here.</Text>
        </View>
      }
      contentContainerStyle={posts.length === 0 ? s.emptyContainer : null}
    />
  );
}

const s = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyContainer: { flexGrow: 1 },
  muted: { color: colors.textMuted, fontSize: font.sizes.md, fontWeight: '600' },
  mutedSmall: { color: colors.textFaint, fontSize: font.sizes.sm, marginTop: spacing.xs, textAlign: 'center' },
});
