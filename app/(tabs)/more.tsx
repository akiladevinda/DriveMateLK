import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { NavLinkRow } from '@/components/shared/NavLinkRow';
import { AppHeader, AppScreen } from '@/components/ui';
import { useTranslation } from '@/localization';
import { useAuthStore } from '@/stores/auth-store';

export default function MoreTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  const links: Array<{ label: string; icon: 'settings-outline' | 'alarm-outline' | 'help-buoy-outline' | 'warning-outline' | 'shield-outline' | 'document-outline' | 'bar-chart-outline' | 'person-outline' | 'language-outline' | 'color-palette-outline' | 'notifications-outline' | 'lock-closed-outline' | 'finger-print-outline' | 'card-outline' | 'trash-outline'; href: Href }> = [
    { label: t('more.settings'), icon: 'settings-outline', href: '/settings/profile' },
    { label: t('more.reminders'), icon: 'alarm-outline', href: '/reminders' },
    { label: t('more.roadside'), icon: 'help-buoy-outline', href: '/roadside' },
    { label: 'Accident assistant', icon: 'warning-outline', href: '/accident' },
    { label: t('more.insurance'), icon: 'shield-outline', href: '/insurance' },
    { label: t('more.leasing'), icon: 'document-outline', href: '/leasing' },
    { label: t('more.reports'), icon: 'bar-chart-outline', href: '/reports/vehicle-passport' },
    { label: t('more.profile'), icon: 'person-outline', href: '/settings/profile' },
    { label: t('more.language'), icon: 'language-outline', href: '/settings/language' },
    { label: t('more.appearance'), icon: 'color-palette-outline', href: '/settings/appearance' },
    { label: t('more.notifications'), icon: 'notifications-outline', href: '/settings/notifications' },
    { label: t('more.privacy'), icon: 'lock-closed-outline', href: '/settings/privacy' },
    { label: t('more.security'), icon: 'finger-print-outline', href: '/settings/security' },
    { label: t('more.subscription'), icon: 'card-outline', href: '/settings/subscription' },
    { label: t('more.deleteAccount'), icon: 'trash-outline', href: '/settings/delete-account' },
  ];

  return (
    <AppScreen scrollable>
      <AppHeader title={t('more.title')} />
      <View style={styles.list}>
        {links.map((link) => (
          <NavLinkRow
            key={link.href + link.label}
            icon={link.icon}
            label={link.label}
            onPress={() => router.push(link.href)}
          />
        ))}
        <NavLinkRow
          destructive
          icon="log-out-outline"
          label={t('auth.signOut')}
          onPress={() => void signOut().then(() => router.replace('/(auth)/sign-in'))}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingBottom: 32,
  },
});
