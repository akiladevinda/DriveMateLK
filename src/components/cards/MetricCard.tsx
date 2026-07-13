import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme';
import { radii, shadows, spacing, typography } from '@/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: IoniconName;
  trendLabel?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
};

export function MetricCard({
  label,
  value,
  hint,
  icon,
  trendLabel,
  trendDirection = 'neutral',
}: MetricCardProps) {
  const { colors } = useTheme();

  const trendColor =
    trendDirection === 'up'
      ? colors.success
      : trendDirection === 'down'
        ? colors.danger
        : colors.textMuted;

  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        shadows.sm,
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.accent} />
        ) : null}
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      {hint ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
      {trendLabel ? (
        <Text style={[styles.trend, { color: trendColor }]}>{trendLabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
    minWidth: 140,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.caption,
  },
  value: {
    ...typography.title,
  },
  hint: {
    ...typography.micro,
  },
  trend: {
    ...typography.micro,
    marginTop: spacing.xxs,
  },
});
