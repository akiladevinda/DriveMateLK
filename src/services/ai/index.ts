import { env, isSupabaseConfigured } from '@/lib/env';
import { geminiAIProvider } from '@/services/ai/gemini-provider';
import { mockAIProvider } from '@/services/ai/mock-provider';
import type { AIProvider } from '@/services/ai/types';

let cachedProvider: AIProvider | null = null;

function forceMockAi(): boolean {
  // Optional kill-switch: EXPO_PUBLIC_USE_MOCK_AI=true
  return process.env.EXPO_PUBLIC_USE_MOCK_AI === 'true';
}

/**
 * Returns the active AI provider.
 *
 * - Live Gemini (via Supabase Edge Functions) whenever Supabase is configured,
 *   including local development — unless EXPO_PUBLIC_USE_MOCK_AI=true.
 * - Mock only when Supabase is missing or mock is forced.
 *
 * Gemini API keys must never live in the client; edge functions hold secrets.
 */
export function getAIProvider(): AIProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const useMock = forceMockAi() || !isSupabaseConfigured();
  cachedProvider = useMock ? mockAIProvider : geminiAIProvider;
  return cachedProvider;
}

export function isUsingMockAI(): boolean {
  return forceMockAi() || !isSupabaseConfigured();
}

export function resetAIProviderCache(): void {
  cachedProvider = null;
}

export { mockAIProvider, geminiAIProvider, env };
