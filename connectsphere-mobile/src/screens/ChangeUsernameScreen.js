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
import api, { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, font } from '../theme';

export default function ChangeUsernameScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const u = username.trim().toLowerCase();
    if (u === user?.username) return navigation.goBack();
    if (u.length < 3) return Alert.alert('Too short', 'Username must be at least 3 characters.');
    if (!/^[a-z0-9_]+$/.test(u)) return Alert.alert('Invalid', 'Use only letters, numbers and underscores.');
    setBusy(true);
    try {
      const { data } = await api.patch('/users/me/username', { username: u });
      setUser((prev) => ({ ...prev, ...data.data.user }));
      Alert.alert('Done', 'Your username has been updated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not update', apiError(e));
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
        <Text style={s.headerTitle}>Change Username</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Username</Text>
        <View style={s.inputRow}>
          <Text style={s.at}>@</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
          />
        </View>
        <Text style={s.hint}>Letters, numbers and underscores only. This changes your @handle everywhere.</Text>

        <TouchableOpacity style={[s.button, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={s.buttonText}>Save username</Text>}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  at: { color: colors.textMuted, fontSize: font.sizes.md, marginRight: spacing.xs },
  input: { flex: 1, paddingVertical: spacing.md, color: colors.text, fontSize: font.sizes.md },
  hint: { color: colors.textFaint, fontSize: font.sizes.xs, marginTop: spacing.sm },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  buttonText: { color: colors.white, fontSize: font.sizes.md, fontWeight: '700' },
});
