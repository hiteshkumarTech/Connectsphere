import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';
import { colors, spacing, font } from '../theme';
import PostCard from '../components/PostCard';

export default function HashtagScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { tag } = route.params || {};

  const q = useInfiniteQuery({
    queryKey: ['hashtag', tag],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get(`/posts/hashtag/${encodeURIComponent(tag)}`, {
        params: { page: pageParam, limit: 10 },
      });
      return data.data; // { tag, posts, pagination }
    },
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const p = last.pagination || {};
      const page = p.page || 1;
      const limit = p.limit || 10;
      const total = p.total || 0;
      return page * limit < total ? page + 1 : undefined;
    },
    enabled: Boolean(tag),
  });

  const posts = q.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <View style={s.fill}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          #{tag}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {q.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
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
              <Ionicons name="pricetag-outline" size={42} color={colors.textFaint} />
              <Text style={s.muted}>No posts with #{tag} yet</Text>
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
  headerTitle: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  muted: { color: colors.textMuted, fontSize: font.sizes.md, fontWeight: '600', marginTop: spacing.md },
});
