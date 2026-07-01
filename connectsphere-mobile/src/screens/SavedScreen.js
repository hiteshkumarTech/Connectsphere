import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';
import { colors, spacing, font } from '../theme';
import PostCard from '../components/PostCard';

export default function SavedScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const q = useInfiniteQuery({
    queryKey: ['saved'],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get('/bookmarks', { params: { page: pageParam, limit: 10 } });
      return data.data; // { posts, pagination }
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination?.hasMore ? last.pagination.page + 1 : undefined),
  });

  const posts = q.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <View style={s.fill}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Saved</Text>
        <View style={{ width: 26 }} />
      </View>

      {q.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(i) => i._id}
          renderItem={({ item }) => <PostCard post={item} />}
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
              <Ionicons name="bookmark-outline" size={42} color={colors.textFaint} />
              <Text style={s.muted}>No saved posts yet</Text>
              <Text style={s.mutedSmall}>Tap the bookmark on any post to save it here.</Text>
            </View>
          }
          contentContainerStyle={posts.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + spacing.xl }}
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
});
