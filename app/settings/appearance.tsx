import { StyleSheet, View } from 'react-native';

import { NavLinkRow } from '@/components/shared/NavLinkRow';
import { AppHeader, AppScreen } from '@/components/ui';
import { useTranslation } from '@/localization';
import { useSettingsStore } from '@/stores/settings-store';
import type { ThemeMode } from '@/theme';

const MODES: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

export default function AppearanceSettingsScreen() {
  const { t } = useTranslation();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('more.appearance')} />
      <View style={styles.list}>
        {MODES.map((item) => (
          <NavLinkRow
            key={item.mode}
            label={item.label}
            onPress={() => setThemeMode(item.mode)}
            subtitle={themeMode === item.mode ? 'Selected' : undefined}
          />
        ))}
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
