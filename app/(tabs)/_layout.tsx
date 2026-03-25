import React, { useEffect } from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fontSize, fontWeight, letterSpacing, shadows, spacing } from '../../src/theme';
import { useAppSelector } from '../../src/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_COUNT = 5;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

function AnimatedBadge({ count }: { count: number }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(0, { duration: 0 }),
      withSpring(1.3, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
  }, [count]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[tabStyles.badge, style]}>
      <Text style={tabStyles.badgeText}>{count}</Text>
    </Animated.View>
  );
}

function AnimatedTabButton({ options, isFocused, onPress, onLongPress, badge }: {
  options: any;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  badge?: number;
}) {
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      iconScale.value = withSequence(
        withSpring(1.2, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
    }
  }, [isFocused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const color = isFocused ? colors.primary : colors.textSecondary;

  return (
    <Pressable style={tabStyles.tabButton} onPress={onPress} onLongPress={onLongPress}>
      <Animated.View style={iconStyle}>
        {options.tabBarIcon?.({ color, size: 24 })}
      </Animated.View>
      <Text style={[tabStyles.label, { color }]}>
        {options.title}
      </Text>
      {badge != null && badge > 0 && <AnimatedBadge count={badge} />}
    </Pressable>
  );
}

function AnimatedTabBar({ state, descriptors, navigation }: any) {
  const { bottom } = useSafeAreaInsets();
  const translateX = useSharedValue(state.index * TAB_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(state.index * TAB_WIDTH, {
      damping: 20,
      stiffness: 200,
    });
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[tabStyles.container, { paddingBottom: Math.max(bottom, 8) }]}>
      <Animated.View style={[tabStyles.indicatorWrapper, indicatorStyle]}>
        <View style={tabStyles.indicator} />
      </Animated.View>

      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <AnimatedTabButton
            key={route.key}
            options={options}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            badge={options.tabBarBadge}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const cartItemCount = useAppSelector((s) => s.cart.cart?.items.length ?? 0);

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: fontWeight.bold,
          fontSize: fontSize.xl,
          letterSpacing: letterSpacing.tight,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => <Ionicons name="cart" size={size} color={color} />,
          tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    ...shadows.lg,
  },
  indicatorWrapper: {
    position: 'absolute',
    top: 0,
    width: TAB_WIDTH,
    alignItems: 'center',
  },
  indicator: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: '18%',
    backgroundColor: '#e53935',
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
});
