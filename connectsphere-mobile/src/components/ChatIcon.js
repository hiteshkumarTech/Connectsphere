import { useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useChatNotifications } from '../context/SocketContext';
import { colors, spacing } from '../theme';

export default function ChatIcon() {
  const navigation = useNavigation();
  const { unreadCount, pulse } = useChatNotifications() || {};
  const count = unreadCount || 0;

  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const firstRun = useRef(true);

  // Bump + glow whenever a new message arrives (pulse changes).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.28, useNativeDriver: true, speed: 20, bounciness: 12 }),
        Animated.timing(glow, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
        Animated.timing(glow, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
    ]).start();
  }, [pulse, scale, glow]);

  return (
    <TouchableOpacity
      style={s.btn}
      onPress={() => navigation.navigate('ChatList')}
      hitSlop={8}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Animated.View
          pointerEvents="none"
          style={[
            s.glow,
            {
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] }) }],
            },
          ]}
        />
        <Ionicons name="chatbubble-ellipses-outline" size={23} color={count > 0 ? colors.brand : colors.text} />
      </Animated.View>
      {count > 0 ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  glow: {
    position: 'absolute',
    top: -7,
    left: -7,
    right: -7,
    bottom: -7,
    borderRadius: 22,
    backgroundColor: colors.brand,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 10,
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
