import { StyleSheet, Text, View } from 'react-native';

import { NavLinkRow } from '@/components/shared/NavLinkRow';
import { AppHeader, AppScreen } from '@/components/ui';
import { useTranslation } from '@/localization';
import { useSettingsStore, type AppLanguage } from '@/stores/settings-store';
import { useTheme } from '@/theme';
import { typography } from '@/theme/tokens';

const LANGUAGES: { code: AppLanguage; labelKey: string }[] = [
  { code: 'en', labelKey: 'settings.languageEn' },
  { code: 'si', labelKey: 'settings.languageSi' },
  { code: 'ta', labelKey: 'settings.languageTa' },
];

export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('more.language')} />
      <View style={styles.list}>
        {LANGUAGES.map((item) => (
          <View key={item.code}>
            <NavLinkRow
              label={t(item.labelKey)}
              onPress={() => setLanguage(item.code)}
              subtitle={language === item.code ? 'Selected' : undefined}
            />
            {language === item.code ? (
              <Text style={[styles.selected, { color: colors.accent }]}>✓ Active</Text>
            ) : null}
          </View>
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
  selected: {
    ...typography.caption,
    marginLeft: 16,
    marginTop: -4,
    marginBottom: 8,
  },
});
