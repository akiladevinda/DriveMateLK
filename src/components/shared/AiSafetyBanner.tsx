import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/localization';
import { useTheme } from '@/theme';
import { radii, spacing, typography } from '@/theme/tokens';
import { AI_SAFETY_DISCLAIMER } from '@/types/ai';

type AiSafetyBannerProps = {
  notice?: string;
};

export function AiSafetyBanner({ notice }: AiSafetyBannerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="text"
      style={[styles.banner, { backgroundColor: colors.warningMuted, borderColor: colors.warning }]}
    >
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        {notice ?? t('ai.safetyNotice') ?? AI_SAFETY_DISCLAIMER}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  text: {
    ...typography.caption,
    lineHeight: 18,
  },
});
