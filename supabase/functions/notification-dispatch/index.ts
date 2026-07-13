import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { isAuthContext, verifyAuth } from '../_shared/auth.ts';

type NotificationDispatchInput = {
  userId?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channel?: 'push' | 'email' | 'both';
};

/**
 * Dispatches notifications to a user's registered push tokens.
 * Uses service role for token lookup; caller must be authenticated.
 * In production, wire Expo Push / FCM / SendGrid here.
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!isAuthContext(auth)) return auth;

  let input: NotificationDispatchInput;
  try {
    input = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (!input.title?.trim() || !input.body?.trim()) {
    return errorResponse('title and body are required');
  }

  const targetUserId = input.userId ?? auth.user.id;

  if (targetUserId !== auth.user.id) {
    return errorResponse('Cannot dispatch notifications for other users', 403);
  }

  const { data: tokens, error: tokenError } = await auth.supabase
    .from('device_push_tokens')
    .select('token, platform')
    .eq('user_id', targetUserId);

  if (tokenError) {
    return errorResponse('Failed to load push tokens', 500);
  }

  const { data: prefs } = await auth.supabase
    .from('notification_preferences')
    .select('push_notifications, email_notifications, quiet_hours_start, quiet_hours_end')
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (prefs && !prefs.push_notifications && input.channel !== 'email') {
    return jsonResponse({
      dispatched: false,
      reason: 'Push notifications disabled by user',
      tokenCount: tokens?.length ?? 0,
    });
  }

  const dispatched: Array<{ token: string; platform: string; status: string }> = [];

  for (const row of tokens ?? []) {
    dispatched.push({
      token: row.token.slice(0, 12) + '…',
      platform: row.platform,
      status: 'queued_stub',
    });
  }

  return jsonResponse({
    dispatched: true,
    channel: input.channel ?? 'push',
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    recipients: dispatched,
    note: 'Notification dispatch stub — integrate Expo Push or FCM in production.',
  });
});
