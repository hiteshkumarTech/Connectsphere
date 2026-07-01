import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';
import { colors, spacing, font } from '../theme';
import UserRow from '../components/UserRow';

function TabBtn({ label, active, onPress }) {
  return (
    <TouchableOpacity style={s.tabBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={[s.tabText, active && { color: colors.brand }]}>{label}</Text>
      {active ? <View style={s.tabUnderline} /> : null}
    </TouchableOpacity>
  );
}

export default function FollowListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { username, initialTab } = route.params || {};
  const [tab, setTab] = useState(initialTab === 'following' ? 'following' : 'followers');

  const q = useInfiniteQuery({
    queryKey: ['followList', username, tab],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get(`/users/${username}/${tab}`, { params: { page: pageParam, limit: 20 } });
      return data.data; // { users, pagination }
    },
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const p = last.pagination || {};
      const page = p.page || 1;
      const limit = p.limit || 20;
      const total = p.total || 0;
      return page * limit < total ? page + 1 : undefined;
    },
    enabled: Boolean(username),
  });

  const users = q.data?.pages.flatMap((p) => p.users) ?? [];

  return (
    <View style={s.fill}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          @{username}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={s.tabs}>
        <TabBtn label="Followers" active={tab === 'followers'} onPress={() => setTab('followers')} />
        <TabBtn label="Following" active={tab === 'following'} onPress={() => setTab('following')} />
      </View>

      {q.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          key={tab}
          data={users}
          keyExtractor={(item) => item._id || item.username}
          renderItem={({ item }) => <UserRow user={item} />}
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
              <Ionicons name="people-outline" size={42} color={colors.textFaint} />
              <Text style={s.muted}>{tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</Text>
            </View>
          }
          contentContainerStyle={users.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + spacing.xl }}
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
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  tabText: { color: colors.textFaint, fontSize: font.sizes.sm, fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: -1, height: 2, width: '50%', backgroundColor: colors.brand, borderRadius: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  muted: { color: colors.textMuted, fontSize: font.sizes.md, fontWeight: '600', marginTop: spacing.md },
});
