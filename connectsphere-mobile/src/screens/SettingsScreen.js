import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, font } from '../theme';

function Row({ icon, label, subtitle, onPress, right }) {
  const content = (
    <>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{label}</Text>
        {subtitle ? (
          <Text style={s.rowSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right || (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null)}
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={s.row}>{content}</View>;
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, setUser, logout } = useAuth();
  const [isPrivate, setIsPrivate] = useState(user?.privacy === 'private');

  const togglePrivacy = async (val) => {
    setIsPrivate(val);
    try {
      const { data } = await api.patch('/users/me', { privacy: val ? 'private' : 'public' });
      setUser((u) => ({ ...u, ...data.data.user }));
    } catch (e) {
      setIsPrivate(!val);
      Alert.alert('Could not update privacy', 'Please try again.');
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={s.fill}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.group}>
          <Row icon="person-outline" label="Edit Profile" onPress={() => navigation.navigate('EditProfile')} />
          <Row
            icon="at-outline"
            label="Change Username"
            subtitle={`@${user?.username}`}
            onPress={() => navigation.navigate('ChangeUsername')}
          />
          <Row
            icon="lock-closed-outline"
            label="Private Account"
            subtitle={isPrivate ? 'Only followers can see your posts' : 'Anyone can see your posts'}
            right={
              <Switch
                value={isPrivate}
                onValueChange={togglePrivacy}
                trackColor={{ true: colors.brand, false: colors.border }}
                thumbColor={colors.white}
              />
            }
          />
          <Row icon="key-outline" label="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
        </View>

        <Text style={s.sectionLabel}>About</Text>
        <View style={s.group}>
          <Row icon="information-circle-outline" label="Version" subtitle="ConnectSphere 1.0.0" />
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.coral} />
          <Text style={s.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  sectionLabel: {
    color: colors.textFaint,
    fontSize: font.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  group: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { color: colors.text, fontSize: font.sizes.md, fontWeight: '600' },
  rowSub: { color: colors.textFaint, fontSize: font.sizes.sm, marginTop: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: { color: colors.coral, fontSize: font.sizes.md, fontWeight: '700' },
});
