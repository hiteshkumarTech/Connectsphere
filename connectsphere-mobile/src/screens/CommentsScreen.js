import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api, { apiError } from '../api/client';
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

export default function CommentsScreen({ route, navigation }) {
  const { postId } = route.params;
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get(`/posts/${postId}/comments`, { params: { limit: 50 } })
      .then((r) => active && setComments(r.data.data.comments || []))
      .catch(() => active && setComments([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [postId]);

  const submit = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, { content });
      setComments((prev) => [data.data.comment, ...prev]);
      setText('');
    } catch (e) {
      // keep the text so the user can retry
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const a = item.author || {};
    const initial = (a.name || a.username || '?').charAt(0).toUpperCase();
    return (
      <View style={s.comment}>
        {a.avatar ? (
          <Image source={{ uri: a.avatar }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={s.commentBody}>
          <Text style={s.cName}>
            {a.name || a.username} <Text style={s.cHandle}>· {timeAgo(item.createdAt)}</Text>
          </Text>
          <Text style={s.cContent}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-down" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Comments</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={comments.length === 0 ? s.centerPad : { padding: spacing.lg }}
          ListEmptyComponent={<Text style={s.empty}>No comments yet. Be the first.</Text>}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={[s.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Add a comment…"
          placeholderTextColor={colors.textFaint}
          maxLength={2000}
        />
        <TouchableOpacity
          onPress={submit}
          disabled={!text.trim() || sending}
          style={[s.send, (!text.trim() || sending) && { opacity: 0.4 }]}
        >
          {sending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons name="send" size={18} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerPad: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.textFaint, fontSize: font.sizes.md },
  comment: { flexDirection: 'row', marginBottom: spacing.lg },
  avatar: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.text, fontSize: font.sizes.sm, fontWeight: '700' },
  commentBody: { flex: 1, marginLeft: spacing.md },
  cName: { color: colors.text, fontSize: font.sizes.sm, fontWeight: '700' },
  cHandle: { color: colors.textFaint, fontWeight: '400' },
  cContent: { color: colors.text, fontSize: font.sizes.md, lineHeight: 20, marginTop: 2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: font.sizes.md,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
