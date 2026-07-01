import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import api, { apiError } from '../api/client';
import { colors, spacing, radius, font } from '../theme';

const MAX_IMAGES = 4;

export default function CreatePostScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);

  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add images to your post.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8, // compress on-device before upload
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (uri) => setImages((prev) => prev.filter((i) => i.uri !== uri));

  const canPost = (content.trim().length > 0 || images.length > 0) && !busy;

  const submit = async () => {
    if (!canPost) return;
    setBusy(true);
    try {
      const form = new FormData();
      if (content.trim()) form.append('content', content.trim());
      images.forEach((img, idx) => {
        form.append('images', { uri: img.uri, name: `image_${idx}.jpg`, type: 'image/jpeg' });
      });
      // Let axios set the multipart Content-Type (with boundary) itself.
      await api.post('/posts', form);
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not post', apiError(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={busy} hitSlop={8}>
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>New post</Text>
        <TouchableOpacity onPress={submit} disabled={!canPost} style={[s.postBtn, !canPost && s.postBtnDisabled]}>
          {busy ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.postBtnText}>Post</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <TextInput
          style={s.input}
          value={content}
          onChangeText={setContent}
          placeholder="What's happening?"
          placeholderTextColor={colors.textFaint}
          multiline
          autoFocus
          maxLength={5000}
        />

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.thumbs}>
            {images.map((img) => (
              <View key={img.uri} style={s.thumbWrap}>
                <Image source={{ uri: img.uri }} style={s.thumb} />
                <TouchableOpacity style={s.removeBtn} onPress={() => removeImage(img.uri)} hitSlop={6}>
                  <Ionicons name="close" size={16} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      <View style={[s.toolbar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity onPress={pickImages} disabled={images.length >= MAX_IMAGES} style={s.toolBtn}>
          <Ionicons
            name="image-outline"
            size={24}
            color={images.length >= MAX_IMAGES ? colors.textFaint : colors.brand}
          />
          <Text style={[s.toolText, images.length >= MAX_IMAGES && { color: colors.textFaint }]}>
            {images.length > 0 ? `Photos ${images.length}/${MAX_IMAGES}` : 'Add photo'}
          </Text>
        </TouchableOpacity>
        <Text style={s.counter}>{content.length}/5000</Text>
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
  cancel: { color: colors.textMuted, fontSize: font.sizes.md },
  headerTitle: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700' },
  postBtn: { backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: colors.white, fontWeight: '700', fontSize: font.sizes.sm },
  body: { padding: spacing.lg },
  input: { color: colors.text, fontSize: font.sizes.lg, lineHeight: 24, minHeight: 120, textAlignVertical: 'top' },
  thumbs: { marginTop: spacing.lg },
  thumbWrap: { marginRight: spacing.md, position: 'relative' },
  thumb: { width: 110, height: 110, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toolText: { color: colors.brand, fontSize: font.sizes.sm, fontWeight: '600' },
  counter: { color: colors.textFaint, fontSize: font.sizes.xs },
});
