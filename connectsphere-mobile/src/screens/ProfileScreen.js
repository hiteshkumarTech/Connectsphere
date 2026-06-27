import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, font } from '../theme';

function StatBlock({ label, value }) {
  return (
    <View style={s.statBlock}>
      <Text style={s.statValue}>{value ?? 0}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  if (!user) return null;

  const initial = (user.name || user.username || '?').charAt(0).toUpperCase();

  return (
    <ScrollView style={s.flex} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
      <View style={s.header}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarInitial}>{initial}</Text>
          </View>
        )}

        <View style={s.nameRow}>
          <Text style={s.name}>{user.name}</Text>
          {user.verifiedBadge ? (
            <Ionicons name="checkmark-circle" size={18} color={colors.brand} style={{ marginLeft: 6 }} />
          ) : null}
        </View>
        <Text style={s.handle}>@{user.username}</Text>

        {user.bio ? <Text style={s.bio}>{user.bio}</Text> : null}

        <View style={s.stats}>
          <StatBlock label="Posts" value={user.postsCount} />
          <StatBlock label="Followers" value={user.followersCount} />
          <StatBlock label="Following" value={user.followingCount} />
        </View>

        {!user.emailVerified ? (
          <View style={s.notice}>
            <Ionicons name="mail-unread-outline" size={16} color={colors.coral} />
            <Text style={s.noticeText}>Verify your email from the link we sent you.</Text>
          </View>
        ) : null}

        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.coral} />
          <Text style={s.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingTop: spacing.xl, paddingHorizontal: spacing.xl },
  avatar: { width: 96, height: 96, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.text, fontSize: 36, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  name: { color: colors.text, fontSize: font.sizes.xl, fontWeight: '800' },
  handle: { color: colors.textMuted, fontSize: font.sizes.md, marginTop: 2 },
  bio: { color: colors.text, fontSize: font.sizes.md, textAlign: 'center', marginTop: spacing.md, lineHeight: 21 },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    width: '100%',
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: font.sizes.lg, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: font.sizes.xs, marginTop: 2 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(251,113,133,0.10)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  noticeText: { color: colors.coral, fontSize: font.sizes.sm, flex: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.xxl,
    width: '100%',
  },
  logoutText: { color: colors.coral, fontSize: font.sizes.md, fontWeight: '700' },
});
