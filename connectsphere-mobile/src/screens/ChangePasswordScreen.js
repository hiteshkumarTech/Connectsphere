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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api, { apiError, tokenStore, setAccessToken } from '../api/client';
import { colors, spacing, radius, font } from '../theme';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!current || !next) return Alert.alert('Missing fields', 'Fill in all fields.');
    if (next.length < 8) return Alert.alert('Weak password', 'New password must be at least 8 characters.');
    if (next !== confirm) return Alert.alert('Mismatch', 'New passwords do not match.');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      // The backend rotates the session; store the fresh tokens so this device stays signed in.
      const { accessToken, refreshToken } = data.data;
      if (accessToken) {
        await tokenStore.set(accessToken, refreshToken);
        setAccessToken(accessToken);
      }
      Alert.alert('Done', 'Your password has been updated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not change password', apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Change Password</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Current password</Text>
        <TextInput
          style={s.input}
          value={current}
          onChangeText={setCurrent}
          placeholder="••••••••"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
        />

        <Text style={s.label}>New password</Text>
        <TextInput
          style={s.input}
          value={next}
          onChangeText={setNext}
          placeholder="At least 8 characters"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
        />

        <Text style={s.label}>Confirm new password</Text>
        <TextInput
          style={s.input}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Re-enter new password"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
        />

        <TouchableOpacity style={[s.button, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={s.buttonText}>Update password</Text>}
        </TouchableOpacity>
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
  headerTitle: { color: colors.text, fontSize: font.sizes.md, fontWeight: '700' },
  body: { padding: spacing.lg },
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
  button: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  buttonText: { color: colors.white, fontSize: font.sizes.md, fontWeight: '700' },
});
