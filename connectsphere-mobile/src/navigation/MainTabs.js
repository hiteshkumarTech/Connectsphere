import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import FeedScreen from '../screens/FeedScreen';
import SearchScreen from '../screens/SearchScreen';
import ReelsScreen from '../screens/ReelsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationBell from '../components/NotificationBell';
import ChatIcon from '../components/ChatIcon';

const Tab = createBottomTabNavigator();

const ICONS = { Home: 'home', Search: 'search', Reels: 'film', Profile: 'person' };

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: '700', fontSize: 20 },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 58, paddingBottom: 6, paddingTop: 6 },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarIcon: ({ color, size, focused }) => {
          const base = ICONS[route.name] || 'ellipse';
          return <Ionicons name={focused ? base : `${base}-outline`} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={FeedScreen}
        options={({ navigation }) => ({
          title: 'ConnectSphere',
          headerRight: () => <NotificationBell />,
          headerLeft: () => <ChatIcon />,
        })}
      />
      <Tab.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Reels" component={ReelsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
