import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import { useTheme } from '@/theme';
import { radii, shadows, spacing, typography } from '@/theme/tokens';

type HealthFactor = {
  label: string;
  statusLabel: string;
  variant: StatusBadgeVariant;
};

type HealthScoreCardProps = {
  score: number;
  statusLabel?: string;
  factors?: HealthFactor[];
};

const HEALTH_DISCLAIMER =
  'This score is an app-generated maintenance indicator and does not prove mechanical roadworthiness.';

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreVariant(score: number): StatusBadgeVariant {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'danger';
}

function defaultStatusLabel(score: number): string {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Needs Attention';
  return 'At Risk';
}

export function HealthScoreCard({
  score,
  statusLabel,
  factors = [],
}: HealthScoreCardProps) {
  const { colors } = useTheme();
  const normalizedScore = clampScore(score);
  const label = statusLabel ?? defaultStatusLabel(normalizedScore);

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Vehicle health score ${normalizedScore} out of 100. ${HEALTH_DISCLAIMER}`}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        shadows.sm,
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Vehicle Health Score
          </Text>
          <StatusBadge label={label} variant={scoreVariant(normalizedScore)} />
        </View>
        <Text style={[styles.score, { color: colors.accent }]}>
          {normalizedScore}
          <Text style={[styles.scoreSuffix, { color: colors.textMuted }]}>
            /100
          </Text>
        </Text>
      </View>

      {factors.length > 0 ? (
        <View style={styles.factors}>
          {factors.map((factor) => (
            <View key={factor.label} style={styles.factorRow}>
              <Text style={[styles.factorLabel, { color: colors.textSecondary }]}>
                {factor.label}
              </Text>
              <StatusBadge label={factor.statusLabel} variant={factor.variant} />
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        {HEALTH_DISCLAIMER}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.bodyStrong,
    marginBottom: spacing.xs,
  },
  score: {
    ...typography.display,
  },
  scoreSuffix: {
    ...typography.body,
  },
  factors: {
    gap: spacing.sm,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  factorLabel: {
    ...typography.caption,
    flex: 1,
  },
  disclaimer: {
    ...typography.micro,
    lineHeight: 16,
  },
});
