import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

function Stat({ icon, value }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={s.statText}>{value || 0}</Text>
    </View>
  );
}

export default function PostCard({ post }) {
  const author = post.author || {};
  const image = post.images?.[0]?.url;
  const initial = (author.name || author.username || '?').charAt(0).toUpperCase();

  return (
    <View style={s.card}>
      <View style={s.header}>
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
          </View>
          <Text style={s.handle} numberOfLines={1}>
            @{author.username} · {timeAgo(post.createdAt)}
          </Text>
        </View>
      </View>

      {post.content ? <Text style={s.content}>{post.content}</Text> : null}

      {image ? <Image source={{ uri: image }} style={s.image} resizeMode="cover" /> : null}

      <View style={s.stats}>
        <Stat icon="heart-outline" value={post.reactionsCount} />
        <Stat icon="chatbubble-outline" value={post.commentsCount} />
        <Stat icon="arrow-redo-outline" value={post.sharesCount} />
      </View>
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
  stats: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.xl },
  stat: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statText: { color: colors.textMuted, fontSize: font.sizes.sm },
});
