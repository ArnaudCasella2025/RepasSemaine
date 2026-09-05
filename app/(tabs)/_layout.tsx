import { Tabs } from 'expo-router';
import { BasketIcon, CalendarIcon, HeartIcon, MenuLinesIcon } from '../../components/icons';
import { colors, fonts } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textPlaceholder,
        tabBarStyle: {
          backgroundColor: colors.surfaceAlt,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          height: 68,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Semaine',
          tabBarIcon: ({ color, size }) => <CalendarIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => <MenuLinesIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, size }) => <BasketIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="envies"
        options={{
          title: 'Envies',
          tabBarIcon: ({ color, size }) => <HeartIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
