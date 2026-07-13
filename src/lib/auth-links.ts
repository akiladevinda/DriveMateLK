import * as Linking from 'expo-linking';

/** Deep-link used for email confirmation / password reset. */
export function getAuthRedirectUrl(): string {
  return Linking.createURL('auth/callback');
}

export type AuthCallbackParams = {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
  errorDescription: string | null;
};

/**
 * Parse tokens from a Supabase auth redirect URL.
 * Email links often use hash fragments: scheme://path#access_token=...&refresh_token=...
 */
export function parseAuthCallbackUrl(url: string): AuthCallbackParams {
  const parsed = Linking.parse(url);
  const query = parsed.queryParams ?? {};

  let accessToken = typeof query.access_token === 'string' ? query.access_token : null;
  let refreshToken = typeof query.refresh_token === 'string' ? query.refresh_token : null;
  let type = typeof query.type === 'string' ? query.type : null;
  let errorDescription =
    typeof query.error_description === 'string' ? query.error_description : null;

  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    const hash = url.slice(hashIndex + 1);
    const hashParams = new URLSearchParams(hash);
    accessToken = accessToken ?? hashParams.get('access_token');
    refreshToken = refreshToken ?? hashParams.get('refresh_token');
    type = type ?? hashParams.get('type');
    errorDescription = errorDescription ?? hashParams.get('error_description');
  }

  return { accessToken, refreshToken, type, errorDescription };
}
