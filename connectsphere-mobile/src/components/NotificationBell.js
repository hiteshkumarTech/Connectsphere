import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { colors, spacing } from '../theme';

export default function NotificationBell() {
  const navigation = useNavigation();
  const { data } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data.data.unreadCount || 0;
    },
    refetchInterval: 45000,
    staleTime: 20000,
  });
  const count = data || 0;

  return (
    <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Notifications')} hitSlop={8}>
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {count > 0 ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  badge: {
    position: 'absolute',
    top: -2,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
});
