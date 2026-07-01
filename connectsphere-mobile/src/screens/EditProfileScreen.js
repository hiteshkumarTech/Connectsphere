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
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, font } from '../theme';

const COVER_HEIGHT = 150;

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [cover, setCover] = useState(user?.coverPhoto || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // 'avatar' | 'cover' | null

  const initial = (name || user?.username || '?').charAt(0).toUpperCase();

  const pickAndUpload = async (kind) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to change your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: kind === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploading(kind);
    try {
      const form = new FormData();
      form.append('image', { uri: asset.uri, name: `${kind}.jpg`, type: 'image/jpeg' });
      const endpoint = kind === 'avatar' ? '/users/me/avatar' : '/users/me/cover';
      const { data } = await api.post(endpoint, form);
      const url = kind === 'avatar' ? data.data.avatar : data.data.coverPhoto;
      if (kind === 'avatar') {
        setAvatar(url);
        setUser((u) => ({ ...u, avatar: url }));
      } else {
        setCover(url);
        setUser((u) => ({ ...u, coverPhoto: url }));
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) {
      Alert.alert('Upload failed', apiError(e));
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', {
        name: name.trim(),
        bio,
        location,
        website: website.trim(),
      });
      setUser((u) => ({ ...u, ...data.data.user }));
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', apiError(e));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={saving} hitSlop={8}>
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={save} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.5 }]}>
          {saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.coverWrap} onPress={() => pickAndUpload('cover')} activeOpacity={0.85}>
          {cover ? <Image source={{ uri: cover }} style={s.cover} /> : <View style={[s.cover, s.coverFallback]} />}
          <View style={s.coverScrim} />
          <View style={s.editBadgeLg}>
            {uploading === 'cover' ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="camera" size={16} color={colors.white} />
                <Text style={s.editBadgeText}>Change cover</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <View style={s.avatarWrap}>
          <TouchableOpacity onPress={() => pickAndUpload('avatar')} activeOpacity={0.85}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={s.avatarEdit}>
              {uploading === 'avatar' ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Ionicons name="camera" size={14} color={colors.white} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.form}>
          <Text style={s.label}>Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.textFaint} maxLength={60} />

          <Text style={s.label}>Bio</Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={300}
          />
          <Text style={s.counter}>{bio.length}/300</Text>

          <Text style={s.label}>Location</Text>
          <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="City, Country" placeholderTextColor={colors.textFaint} maxLength={100} />

          <Text style={s.label}>Website</Text>
          <TextInput
            style={s.input}
            value={website}
            onChangeText={setWebsite}
            placeholder="https://yoursite.com"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />
        </View>
      </ScrollView>
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
  saveBtn: { backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  saveText: { color: colors.white, fontWeight: '700', fontSize: font.sizes.sm },

  coverWrap: { height: COVER_HEIGHT, backgroundColor: colors.surfaceAlt },
  cover: { width: '100%', height: COVER_HEIGHT },
  coverFallback: { backgroundColor: colors.brandSoft },
  coverScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  editBadgeLg: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  editBadgeText: { color: colors.white, fontSize: font.sizes.sm, fontWeight: '600' },

  avatarWrap: { paddingHorizontal: spacing.lg, marginTop: -42 },
  avatar: { width: 88, height: 88, borderRadius: radius.full, borderWidth: 4, borderColor: colors.bg, backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.text, fontSize: 32, fontWeight: '800' },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    left: 64,
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  form: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  label: { color: colors.textMuted, fontSize: font.sizes.sm, marginBottom: spacing.xs, marginTop: spacing.lg },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: font.sizes.md,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  counter: { color: colors.textFaint, fontSize: font.sizes.xs, alignSelf: 'flex-end', marginTop: spacing.xs },
});
