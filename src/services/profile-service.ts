import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { ProfileUpdateInput } from '@/schemas/auth';
import type { Profile, TablesInsert, TablesUpdate } from '@/types/database';

export type ProfileServiceError = {
  message: string;
  code?: string;
};

export type ProfileResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProfileServiceError };

function mapError(error: { message: string; code?: string } | null): ProfileServiceError | null {
  if (!error) {
    return null;
  }
  return { message: error.message, code: error.code ?? 'profile_error' };
}

/**
 * Ensures a profiles row exists for the signed-in user.
 * Needed when the auth.users trigger did not create one (common on early projects).
 */
export async function ensureProfile(
  userId: string,
  extras?: { email?: string | null; fullName?: string | null },
): Promise<ProfileResult<Profile>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const existing = await getProfile(userId);
  if (existing.data) {
    return existing;
  }

  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;
  const email =
    extras?.email?.trim() ||
    authUser?.email ||
    `${userId}@unknown.local`;
  const fullName =
    extras?.fullName?.trim() ||
    (authUser?.user_metadata?.full_name as string | undefined) ||
    (authUser?.user_metadata?.name as string | undefined) ||
    email.split('@')[0] ||
    'Driver';

  const payload: TablesInsert<'profiles'> = {
    id: userId,
    email,
    full_name: fullName,
    onboarding_completed: false,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  if (!data) {
    return { data: null, error: { message: 'Failed to create profile', code: 'profile_missing' } };
  }

  await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      theme_mode: 'system',
      language: data.preferred_language ?? 'en',
      currency_code: data.preferred_currency ?? 'LKR',
      notifications_enabled: true,
      biometric_enabled: false,
      email_notifications: true,
      push_notifications: true,
    },
    { onConflict: 'user_id' },
  );

  return { data, error: null };
}

export async function getProfile(userId: string): Promise<ProfileResult<Profile>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  if (!data) {
    return { data: null, error: { message: 'Profile not found', code: 'not_found' } };
  }

  return { data, error: null };
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<ProfileResult<Profile>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const ensured = await ensureProfile(userId);
  if (ensured.error || !ensured.data) {
    return ensured;
  }

  const payload: TablesUpdate<'profiles'> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  if (!data) {
    return { data: null, error: { message: 'Failed to update profile', code: 'update_failed' } };
  }

  return { data, error: null };
}

export async function completeOnboarding(userId: string): Promise<ProfileResult<Profile>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const ensured = await ensureProfile(userId);
  if (ensured.error || !ensured.data) {
    return ensured;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  if (!data) {
    return {
      data: null,
      error: { message: 'Failed to complete onboarding', code: 'update_failed' },
    };
  }

  const settingsPayload: TablesInsert<'user_settings'> = {
    user_id: userId,
    theme_mode: 'system',
    language: data.preferred_language,
    currency_code: data.preferred_currency,
    notifications_enabled: true,
    biometric_enabled: false,
    email_notifications: true,
    push_notifications: true,
  };

  await supabase.from('user_settings').upsert(settingsPayload, { onConflict: 'user_id' });

  return { data, error: null };
}
