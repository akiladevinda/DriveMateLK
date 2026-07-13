import { z } from 'zod';

const clientEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  EXPO_PUBLIC_APP_ENV: z
    .enum(['development', 'preview', 'production'])
    .default('development'),
  EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY: z.string().optional(),
  EXPO_PUBLIC_SUPPORT_EMAIL: z.string().email().optional().or(z.literal('')),
  EXPO_PUBLIC_PRIVACY_POLICY_URL: z.string().url().optional().or(z.literal('')),
  EXPO_PUBLIC_TERMS_URL: z.string().url().optional().or(z.literal('')),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export type EnvValidationResult =
  | { ok: true; env: ClientEnv; missingRequired: string[] }
  | { ok: false; env: ClientEnv; missingRequired: string[]; message: string };

function readRawEnv(): Record<string, string | undefined> {
  return {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY:
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY,
    EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY,
    EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
    EXPO_PUBLIC_PRIVACY_POLICY_URL: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
    EXPO_PUBLIC_TERMS_URL: process.env.EXPO_PUBLIC_TERMS_URL,
  };
}

export function validateClientEnv(): EnvValidationResult {
  const parsed = clientEnvSchema.safeParse(readRawEnv());
  const env = (parsed.success ? parsed.data : clientEnvSchema.parse({})) as ClientEnv;

  const missingRequired: string[] = [];
  if (!env.EXPO_PUBLIC_SUPABASE_URL) {
    missingRequired.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    missingRequired.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (missingRequired.length > 0) {
    return {
      ok: false,
      env,
      missingRequired,
      message: `Missing required environment variables: ${missingRequired.join(', ')}. Copy .env.example to .env and fill in Supabase values.`,
    };
  }

  return { ok: true, env, missingRequired: [] };
}

export function isSupabaseConfigured(): boolean {
  const result = validateClientEnv();
  return result.ok;
}

export const env = validateClientEnv().env;
