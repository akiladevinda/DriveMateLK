import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import {
  completeReminder,
  listReminders,
  snoozeReminder,
  syncAllLocalReminders,
  type UnifiedReminder,
} from '@/services/reminder-service';
import { useAuthStore } from '@/stores/auth-store';

export function useReminders() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.reminders(user?.id ?? 'anonymous'),
    queryFn: async () => {
      if (!user) return [];
      const result = await listReminders(user.id);
      if (result.error) throw new Error(result.error.message);
      void syncAllLocalReminders(user.id);
      return result.data;
    },
    enabled: Boolean(user),
  });
}

export function useReminderActions() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (user) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reminders(user.id) });
    }
  };

  const snooze = useMutation({
    mutationFn: async (reminder: UnifiedReminder) => {
      if (!user) throw new Error('Not signed in');
      const result = await snoozeReminder(user.id, reminder);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: async (reminder: UnifiedReminder) => {
      if (!user) throw new Error('Not signed in');
      const result = await completeReminder(user.id, reminder);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: invalidate,
  });

  return { snooze, complete };
}

export function reminderCardStatus(
  reminder: UnifiedReminder,
): 'upcoming' | 'due_soon' | 'overdue' | 'completed' {
  if (reminder.status === 'completed') return 'completed';
  if (reminder.status === 'overdue') return 'overdue';
  if (!reminder.dueDate) return 'upcoming';

  const today = new Date();
  const due = new Date(reminder.dueDate);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'due_soon';
  return 'upcoming';
}
