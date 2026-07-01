import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import api, { apiError } from '../api/client';
import { colors, spacing, radius, font } from '../theme';

export default function EditPostScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { post } = route.params;

  const [content, setContent] = useState(post?.content || '');
  const [busy, setBusy] = useState(false);
  const hasImages = (post?.images?.length || 0) > 0;
  const canSave = content.trim() !== (post?.content || '').trim() && !busy;

  const save = async () => {
    setBusy(true);
    try {
      await api.patch(`/posts/${post._id}`, { content: content.trim() });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['saved'] });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', apiError(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={busy} hitSlop={8}>
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit post</Text>
        <TouchableOpacity onPress={save} disabled={!canSave} style={[s.saveBtn, !canSave && { opacity: 0.4 }]}>
          {busy ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <TextInput
          style={s.input}
          value={content}
          onChangeText={setContent}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textFaint}
          multiline
          autoFocus
          maxLength={5000}
        />
        {hasImages ? (
          <Text style={s.note}>Photos can't be changed here — delete and repost if you need different images.</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
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
  cancel: { color: colors.textMuted, fontSize: font.sizes.md },
  headerTitle: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700' },
  saveBtn: { backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  saveText: { color: colors.white, fontWeight: '700', fontSize: font.sizes.sm },
  body: { padding: spacing.lg },
  input: { color: colors.text, fontSize: font.sizes.lg, lineHeight: 24, minHeight: 120, textAlignVertical: 'top' },
  note: { color: colors.textFaint, fontSize: font.sizes.xs, marginTop: spacing.lg },
});
