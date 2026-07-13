import { addDays, parseISO, startOfDay } from 'date-fns';
import * as Notifications from 'expo-notifications';

import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type {
  DocumentReminder,
  MaintenanceReminder,
  ReminderStatus,
  ReminderType,
  TablesUpdate,
} from '@/types/database';

export type ReminderServiceError = { message: string; code?: string };
export type ReminderResult<T> =
  | { data: T; error: null }
  | { data: null; error: ReminderServiceError };

export type ReminderSource = 'document' | 'maintenance';

export type UnifiedReminder = {
  id: string;
  source: ReminderSource;
  userId: string;
  vehicleId: string;
  reminderType: ReminderType;
  title: string;
  dueDate: string | null;
  dueOdometer: number | null;
  status: ReminderStatus;
  snoozedUntil: string | null;
  completedAt: string | null;
  notes: string | null;
};

const NOTIFICATION_PREFIX = 'reminder-';

function mapError(error: { message: string; code?: string } | null): ReminderServiceError | null {
  if (!error) return null;
  return { message: error.message, code: error.code ?? 'reminder_error' };
}

function notificationId(reminderId: string): string {
  return `${NOTIFICATION_PREFIX}${reminderId}`;
}

function fromDocument(row: DocumentReminder): UnifiedReminder {
  return {
    id: row.id,
    source: 'document',
    userId: row.user_id,
    vehicleId: row.vehicle_id,
    reminderType: row.reminder_type,
    title: row.title,
    dueDate: row.due_date,
    dueOdometer: row.due_odometer,
    status: row.status,
    snoozedUntil: row.snoozed_until,
    completedAt: row.completed_at,
    notes: row.notes,
  };
}

function fromMaintenance(row: MaintenanceReminder): UnifiedReminder {
  return {
    id: row.id,
    source: 'maintenance',
    userId: row.user_id,
    vehicleId: row.vehicle_id,
    reminderType: row.reminder_type,
    title: row.title,
    dueDate: row.due_date,
    dueOdometer: row.due_odometer,
    status: row.status,
    snoozedUntil: row.snoozed_until,
    completedAt: row.completed_at,
    notes: null,
  };
}

function computeTriggerDate(dueDateIso: string, daysBefore: number): Date | null {
  const due = parseISO(dueDateIso);
  if (Number.isNaN(due.getTime())) return null;
  const trigger = startOfDay(addDays(due, -daysBefore));
  if (trigger.getTime() <= Date.now()) return null;
  return trigger;
}

export async function listReminders(userId: string): Promise<ReminderResult<UnifiedReminder[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const [docRes, maintRes] = await Promise.all([
    supabase
      .from('document_reminders')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'dismissed')
      .order('due_date', { ascending: true }),
    supabase
      .from('maintenance_reminders')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'dismissed')
      .order('due_date', { ascending: true }),
  ]);

  const docErr = mapError(docRes.error);
  if (docErr) return { data: null, error: docErr };
  const maintErr = mapError(maintRes.error);
  if (maintErr) return { data: null, error: maintErr };

  const combined = [
    ...(docRes.data ?? []).map(fromDocument),
    ...(maintRes.data ?? []).map(fromMaintenance),
  ].sort((a, b) => {
    const aDate = a.dueDate ?? '9999-12-31';
    const bDate = b.dueDate ?? '9999-12-31';
    return aDate.localeCompare(bDate);
  });

  return { data: combined, error: null };
}

export async function snoozeReminder(
  userId: string,
  reminder: UnifiedReminder,
  snoozeDays = 3,
): Promise<ReminderResult<UnifiedReminder>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const snoozedUntil = addDays(new Date(), snoozeDays).toISOString();
  const payload: TablesUpdate<'document_reminders'> = {
    status: 'snoozed',
    snoozed_until: snoozedUntil,
    updated_at: new Date().toISOString(),
  };

  const table = reminder.source === 'document' ? 'document_reminders' : 'maintenance_reminders';
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', reminder.id)
    .eq('user_id', userId)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return { data: null, error: mapped ?? { message: 'Failed to snooze reminder', code: 'update_failed' } };
  }

  const updated = reminder.source === 'document' ? fromDocument(data as DocumentReminder) : fromMaintenance(data as MaintenanceReminder);
  await scheduleLocalReminder(updated, [0]);
  return { data: updated, error: null };
}

export async function completeReminder(
  userId: string,
  reminder: UnifiedReminder,
): Promise<ReminderResult<UnifiedReminder>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const completedAt = new Date().toISOString();
  const payload: TablesUpdate<'document_reminders'> = {
    status: 'completed',
    completed_at: completedAt,
    updated_at: completedAt,
  };

  const table = reminder.source === 'document' ? 'document_reminders' : 'maintenance_reminders';
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', reminder.id)
    .eq('user_id', userId)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return { data: null, error: mapped ?? { message: 'Failed to complete reminder', code: 'update_failed' } };
  }

  await cancelLocalReminder(reminder.id);
  const updated = reminder.source === 'document' ? fromDocument(data as DocumentReminder) : fromMaintenance(data as MaintenanceReminder);
  return { data: updated, error: null };
}

/** Idempotent local notification scheduling keyed by reminder id. */
export async function scheduleLocalReminder(
  reminder: Pick<UnifiedReminder, 'id' | 'title' | 'dueDate' | 'status'>,
  notifyDaysBefore: number[] = [7, 1, 0],
): Promise<void> {
  await cancelLocalReminder(reminder.id);
  if (reminder.status === 'completed' || reminder.status === 'dismissed') return;
  if (!reminder.dueDate) return;

  const id = notificationId(reminder.id);
  for (const daysBefore of notifyDaysBefore) {
    const triggerDate = computeTriggerDate(reminder.dueDate, daysBefore);
    if (!triggerDate) continue;

    const suffix = daysBefore === 0 ? 'due today' : daysBefore === 1 ? 'due tomorrow' : `due in ${daysBefore} days`;
    await Notifications.scheduleNotificationAsync({
      identifier: `${id}-${daysBefore}`,
      content: {
        title: 'DriveMate LK Reminder',
        body: `${reminder.title} — ${suffix}`,
        data: { reminderId: reminder.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  }
}

export async function cancelLocalReminder(reminderId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = notificationId(reminderId);
  const toCancel = scheduled.filter((n) => n.identifier === prefix || n.identifier.startsWith(`${prefix}-`));
  await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function syncAllLocalReminders(userId: string): Promise<void> {
  const result = await listReminders(userId);
  if (!result.data) return;
  const active = result.data.filter((r) => r.status === 'pending' || r.status === 'snoozed' || r.status === 'overdue');
  await Promise.all(active.map((r) => scheduleLocalReminder(r)));
}
