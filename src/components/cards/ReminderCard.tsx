import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import { useTheme } from '@/theme';
import { radii, shadows, spacing, typography } from '@/theme/tokens';
import { daysUntil, formatDisplayDate } from '@/utils/dates';

type ReminderCardProps = {
  title: string;
  dueDateIso?: string | null;
  dueOdometerKm?: number | null;
  reminderType?: string;
  status?: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
  onPress?: () => void;
};

function statusFromDueDate(dueDateIso?: string | null): StatusBadgeVariant {
  if (!dueDateIso) return 'neutral';
  const remaining = daysUntil(dueDateIso);
  if (Number.isNaN(remaining)) return 'neutral';
  if (remaining < 0) return 'danger';
  if (remaining <= 7) return 'warning';
  if (remaining <= 30) return 'info';
  return 'success';
}

function statusLabel(status: ReminderCardProps['status'], dueDateIso?: string | null): string {
  if (status === 'completed') return 'Completed';
  if (status === 'overdue') return 'Overdue';
  if (status === 'due_soon') return 'Due Soon';
  if (dueDateIso) {
    const remaining = daysUntil(dueDateIso);
    if (!Number.isNaN(remaining)) {
      if (remaining < 0) return 'Overdue';
      if (remaining === 0) return 'Due Today';
      if (remaining === 1) return 'Due Tomorrow';
      return `${remaining} days left`;
    }
  }
  return 'Upcoming';
}

export function ReminderCard({
  title,
  dueDateIso,
  dueOdometerKm,
  reminderType,
  status = 'upcoming',
  onPress,
}: ReminderCardProps) {
  const { colors } = useTheme();
  const badgeVariant =
    status === 'completed'
      ? 'neutral'
      : status === 'overdue'
        ? 'danger'
        : status === 'due_soon'
          ? 'warning'
          : statusFromDueDate(dueDateIso);

  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentMuted }]}>
          <Ionicons name="notifications-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text numberOfLines={2} style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {reminderType ? (
            <Text style={[styles.type, { color: colors.textMuted }]}>{reminderType}</Text>
          ) : null}
        </View>
        <StatusBadge label={statusLabel(status, dueDateIso)} variant={badgeVariant} />
      </View>

      <View style={styles.metaRow}>
        {dueDateIso ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Due {formatDisplayDate(dueDateIso)}
          </Text>
        ) : null}
        {dueOdometerKm != null ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            at {dueOdometerKm.toLocaleString('en-LK')} km
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} reminder`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          shadows.sm,
          pressed && { opacity: 0.92 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        shadows.sm,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyStrong,
  },
  type: {
    ...typography.micro,
    textTransform: 'capitalize',
  },
  metaRow: {
    gap: spacing.xxs,
    paddingLeft: 36 + spacing.sm,
  },
  meta: {
    ...typography.caption,
  },
});
