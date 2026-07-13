import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const memoryCounts = new Map<string, { count: number; windowStart: number }>();

export type RateLimitConfig = {
  functionName: string;
  maxRequests: number;
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

export function checkInMemoryRateLimit(
  userId: string,
  config: RateLimitConfig,
): RateLimitResult {
  const key = `${config.functionName}:${userId}`;
  const now = Date.now();
  const entry = memoryCounts.get(key);

  if (!entry || now - entry.windowStart >= config.windowMs) {
    memoryCounts.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfterMs = config.windowMs - (now - entry.windowStart);
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  entry.count += 1;
  memoryCounts.set(key, entry);
  return { allowed: true, remaining: config.maxRequests - entry.count };
}

export async function checkUsageTableRateLimit(
  supabase: SupabaseClient,
  userId: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - config.windowMs).toISOString();
  const { count, error } = await supabase
    .from('ai_usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('function_name', config.functionName)
    .gte('created_at', since);

  if (error) {
    return checkInMemoryRateLimit(userId, config);
  }

  const used = count ?? 0;
  if (used >= config.maxRequests) {
    return { allowed: false, retryAfterMs: config.windowMs };
  }

  return { allowed: true, remaining: config.maxRequests - used - 1 };
}

export async function enforceRateLimit(
  supabase: SupabaseClient,
  userId: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const tableResult = await checkUsageTableRateLimit(supabase, userId, config);
  if (!tableResult.allowed) {
    return tableResult;
  }
  return checkInMemoryRateLimit(userId, config);
}

export function rateLimitResponse(retryAfterMs: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfterMs,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
      },
    },
  );
}

export const DEFAULT_AI_RATE_LIMIT: RateLimitConfig = {
  functionName: 'ai_default',
  maxRequests: 30,
  windowMs: 60 * 60 * 1000,
};
