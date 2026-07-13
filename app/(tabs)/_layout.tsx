import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useTranslation } from '@/localization';
import { useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const tabIcon = (name: IoniconName, focused: boolean) => (
    <Ionicons
      color={focused ? colors.accent : colors.tabInactive}
      name={name}
      size={24}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => tabIcon('home-outline', focused),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: t('tabs.vehicles'),
          tabBarIcon: ({ focused }) => tabIcon('car-outline', focused),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: t('tabs.ai'),
          tabBarIcon: ({ focused }) => tabIcon('sparkles-outline', focused),
        }}
      />
      <Tabs.Screen
        name="garages"
        options={{
          title: t('tabs.garages'),
          tabBarIcon: ({ focused }) => tabIcon('build-outline', focused),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ focused }) => tabIcon('menu-outline', focused),
        }}
      />
    </Tabs>
  );
}
