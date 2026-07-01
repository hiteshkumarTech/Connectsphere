import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../api/client';
import { colors, spacing, radius, font } from '../theme';

export default function UserRow({ user }) {
  const navigation = useNavigation();
  const [following, setFollowing] = useState(Boolean(user.isFollowing));
  const initial = (user.name || user.username || '?').charAt(0).toUpperCase();

  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    try {
      if (next) await api.post(`/users/${user.username}/follow`);
      else await api.delete(`/users/${user.username}/follow`);
    } catch (e) {
      setFollowing(!next);
    }
  };

  const open = () => navigation.navigate('UserProfile', { username: user.username });

  return (
    <View style={s.row}>
      <TouchableOpacity style={s.left} onPress={open} activeOpacity={0.7}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.fallback]}>
            <Text style={s.initial}>{initial}</Text>
          </View>
        )}
        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>
              {user.name || user.username}
            </Text>
            {user.verifiedBadge ? (
              <Ionicons name="checkmark-circle" size={13} color={colors.brand} style={{ marginLeft: 4 }} />
            ) : null}
          </View>
          <Text style={s.handle} numberOfLines={1}>
            @{user.username}
          </Text>
          {user.bio ? (
            <Text style={s.bio} numberOfLines={1}>
              {user.bio}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {!user.isMe ? (
        <TouchableOpacity style={[s.followBtn, following && s.followingBtn]} onPress={toggle} activeOpacity={0.85}>
          <Text style={[s.followText, following && s.followingText]}>{following ? 'Following' : 'Follow'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700' },
  info: { flex: 1, marginLeft: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700', flexShrink: 1 },
  handle: { color: colors.textFaint, fontSize: font.sizes.sm, marginTop: 1 },
  bio: { color: colors.textMuted, fontSize: font.sizes.sm, marginTop: 2 },
  followBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.brand },
  followText: { color: colors.white, fontWeight: '700', fontSize: font.sizes.sm },
  followingBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border },
  followingText: { color: colors.text },
});
