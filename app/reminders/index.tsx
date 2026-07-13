import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ReminderCard } from '@/components/cards';
import {
  AppHeader,
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  SecondaryButton,
} from '@/components/ui';
import { reminderCardStatus, useReminderActions, useReminders } from '@/hooks/use-reminders';
import { isSupabaseConfigured } from '@/lib/env';
import { useTranslation } from '@/localization';
import { spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme';

export default function RemindersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { data: reminders = [], isLoading, isError, error, refetch } = useReminders();
  const { snooze, complete } = useReminderActions();

  const pending = reminders.filter((r) => r.status !== 'completed' && r.status !== 'dismissed');

  if (!isSupabaseConfigured()) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title={t('more.reminders')} />
        <EmptyState
          description="Connect Supabase to sync document and maintenance reminders."
          icon="cloud-offline-outline"
          title="Backend not configured"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('more.reminders')} />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Snooze or complete reminders. Local notifications sync when permission is granted.
      </Text>

      {isLoading ? <LoadingSkeleton lines={4} /> : null}
      {isError ? (
        <ErrorState message={error?.message ?? t('common.error')} onRetry={() => refetch()} />
      ) : null}

      {!isLoading && !isError && pending.length === 0 ? (
        <EmptyState
          description="Document renewals and maintenance reminders will appear here."
          icon="alarm-outline"
          title={t('common.empty')}
        />
      ) : null}

      <View style={styles.list}>
        {pending.map((reminder) => (
          <View key={`${reminder.source}-${reminder.id}`} style={styles.item}>
            <ReminderCard
              dueDateIso={reminder.dueDate}
              dueOdometerKm={reminder.dueOdometer}
              reminderType={reminder.reminderType.replace(/_/g, ' ')}
              status={reminderCardStatus(reminder)}
              title={reminder.title}
            />
            <View style={styles.actions}>
              <SecondaryButton
                label="Snooze 3 days"
                loading={snooze.isPending}
                onPress={() => snooze.mutate(reminder)}
              />
              <SecondaryButton
                label="Complete"
                loading={complete.isPending}
                onPress={() => complete.mutate(reminder)}
              />
            </View>
          </View>
        ))}
      </View>

      <SecondaryButton
        label="Notification settings"
        onPress={() => router.push('/settings/notifications')}
        style={styles.settingsLink}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  item: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  settingsLink: {
    marginTop: spacing.lg,
  },
});
