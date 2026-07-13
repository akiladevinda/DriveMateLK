import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import { radii, spacing, typography } from '@/theme/tokens';

export type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

type StatusBadgeProps = {
  label: string;
  variant?: StatusBadgeVariant;
};

export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  const { colors } = useTheme();

  const palette = {
    success: {
      background: colors.successMuted,
      text: colors.success,
    },
    warning: {
      background: colors.warningMuted,
      text: colors.warning,
    },
    danger: {
      background: colors.dangerMuted,
      text: colors.danger,
    },
    info: {
      background: colors.informationMuted,
      text: colors.information,
    },
    neutral: {
      background: colors.surfaceMuted,
      text: colors.textSecondary,
    },
  }[variant];

  return (
    <View
      accessibilityRole="text"
      style={[styles.badge, { backgroundColor: palette.background }]}
    >
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  label: {
    ...typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
