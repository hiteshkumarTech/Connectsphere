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
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import api, { apiError } from '../api/client';
import { colors, spacing, radius, font } from '../theme';

// Preview remounts per-uri so the player always points at the picked video.
function ReelPreview({ uri, height }) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height, borderRadius: radius.lg, backgroundColor: '#000' }}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

export default function CreateReelScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [video, setVideo] = useState(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow media access to pick a video.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
      videoMaxDuration: 60,
    });
    if (!res.canceled && res.assets?.length) setVideo(res.assets[0]);
  };

  const upload = async () => {
    if (!video || busy) return;
    setBusy(true);
    try {
      const uri = video.uri;
      const name = video.fileName || uri.split('/').pop() || 'reel.mp4';
      const type = video.mimeType || 'video/mp4';
      const form = new FormData();
      form.append('video', { uri, name, type });
      if (caption.trim()) form.append('content', caption.trim());
      // Let axios set the multipart boundary automatically; allow time for large videos.
      await api.post('/posts/reels', form, { timeout: 120000 });
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Upload failed', apiError(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={busy} hitSlop={8}>
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>New reel</Text>
        <TouchableOpacity onPress={upload} disabled={!video || busy} style={[s.postBtn, (!video || busy) && { opacity: 0.4 }]}>
          {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.postText}>Share</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {video ? (
          <View>
            <ReelPreview key={video.uri} uri={video.uri} height={340} />
            <TouchableOpacity style={s.changeBtn} onPress={pickVideo} disabled={busy}>
              <Ionicons name="swap-horizontal" size={16} color={colors.text} />
              <Text style={s.changeText}>Choose a different video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.picker} onPress={pickVideo} activeOpacity={0.8}>
            <Ionicons name="videocam-outline" size={46} color={colors.brand} />
            <Text style={s.pickerTitle}>Pick a video</Text>
            <Text style={s.pickerHint}>Up to 60 seconds • MP4 or MOV</Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={s.caption}
          value={caption}
          onChangeText={setCaption}
          placeholder="Write a caption…  #hashtags work"
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={2000}
        />

        {busy ? <Text style={s.uploading}>Uploading your reel… this can take a moment for larger videos.</Text> : null}
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
  postBtn: { backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  postText: { color: '#fff', fontWeight: '700', fontSize: font.sizes.sm },
  body: { padding: spacing.lg },
  picker: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  pickerTitle: { color: colors.text, fontSize: font.sizes.lg, fontWeight: '700', marginTop: spacing.sm },
  pickerHint: { color: colors.textFaint, fontSize: font.sizes.sm },
  changeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md },
  changeText: { color: colors.text, fontSize: font.sizes.sm, fontWeight: '600' },
  caption: {
    color: colors.text,
    fontSize: font.sizes.md,
    lineHeight: 22,
    marginTop: spacing.lg,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  uploading: { color: colors.textMuted, fontSize: font.sizes.sm, marginTop: spacing.lg, textAlign: 'center' },
});
