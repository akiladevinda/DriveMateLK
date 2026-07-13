import type { Session, User } from '@supabase/supabase-js';

import { getAuthRedirectUrl } from '@/lib/auth-links';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export type AuthServiceError = {
  message: string;
  code?: string;
};

export type AuthResult<T> =
  | { data: T; error: null }
  | { data: null; error: AuthServiceError };

function mapAuthError(error: { message: string; status?: number } | null): AuthServiceError | null {
  if (!error) {
    return null;
  }
  return { message: error.message, code: String(error.status ?? 'auth_error') };
}

function isAlreadyRegisteredMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('already registered') ||
    lower.includes('already been registered') ||
    lower.includes('user already exists') ||
    lower.includes('email address is already')
  );
}

/**
 * Creates an account immediately (no email verification).
 * Returns a clear error if the email is already registered.
 * When Supabase returns a user without a session (Confirm email still on),
 * we attempt an immediate password sign-in.
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult<{ user: User; session: Session }>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { full_name: fullName.trim() },
    },
  });

  if (error) {
    if (isAlreadyRegisteredMessage(error.message)) {
      return {
        data: null,
        error: {
          message: 'This email is already registered. Sign in instead.',
          code: 'email_taken',
        },
      };
    }
    return { data: null, error: mapAuthError(error) };
  }

  // Supabase may return a user with empty identities when the email already exists
  // and "Confirm email" is enabled (anti-enumeration). Treat that as taken.
  const identities = data.user?.identities ?? [];
  if (data.user && identities.length === 0) {
    return {
      data: null,
      error: {
        message: 'This email is already registered. Sign in instead.',
        code: 'email_taken',
      },
    };
  }

  let session = data.session;
  let user = data.user;

  if (!session && user) {
    const signInResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInResult.error) {
      const msg = signInResult.error.message.toLowerCase();
      if (msg.includes('confirm') || msg.includes('not confirmed')) {
        return {
          data: null,
          error: {
            message:
              'Account created, but email confirmation is still required in Supabase. Turn off Authentication → Providers → Email → Confirm email, then try again.',
            code: 'email_confirm_enabled',
          },
        };
      }
      return { data: null, error: mapAuthError(signInResult.error) };
    }

    session = signInResult.data.session;
    user = signInResult.data.user;
  }

  if (!user || !session) {
    return {
      data: null,
      error: {
        message: 'Account creation failed. Please try again.',
        code: 'no_session',
      },
    };
  }

  return { data: { user, session }, error: null };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult<{ user: User; session: Session }>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  const mapped = mapAuthError(error);
  if (mapped || !data.user || !data.session) {
    return {
      data: null,
      error: mapped ?? { message: 'Sign in failed without a session', code: 'no_session' },
    };
  }

  return { data: { user: data.user, session: data.session }, error: null };
}

export async function signOut(): Promise<AuthResult<null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: null };
  }

  const { error } = await supabase.auth.signOut();
  const mapped = mapAuthError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  return { data: null, error: null };
}

export async function resetPassword(email: string): Promise<AuthResult<null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: getAuthRedirectUrl(),
  });
  const mapped = mapAuthError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  return { data: null, error: null };
}

/**
 * Deletes the authenticated user's account and associated data.
 *
 * Requires a Supabase Edge Function named `delete-account` with service-role
 * privileges to remove storage objects, related rows and the auth user safely.
 * The client invokes that function; direct client-side auth.admin deletion is
 * not available with the anon key.
 */
export async function deleteAccount(): Promise<AuthResult<null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
    body: {},
  });

  if (error) {
    return {
      data: null,
      error: {
        message:
          error.message ??
          'Account deletion failed. Deploy the delete-account Edge Function with service-role access.',
        code: 'delete_account_failed',
      },
    };
  }

  await supabase.auth.signOut();
  return { data: null, error: null };
}

export async function getSession(): Promise<AuthResult<Session | null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase.auth.getSession();
  const mapped = mapAuthError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  return { data: data.session, error: null };
}

export async function getCurrentUser(): Promise<AuthResult<User | null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase.auth.getUser();
  const mapped = mapAuthError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  return { data: data.user, error: null };
}
