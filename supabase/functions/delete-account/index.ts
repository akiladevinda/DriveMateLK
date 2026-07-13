import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { isAuthContext, verifyAuth } from '../_shared/auth.ts';

/**
 * Deletes the authenticated user's account and associated data.
 * Uses service role to remove auth.users record after purging app data.
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!isAuthContext(auth)) return auth;

  let confirm: { confirmEmail?: string } = {};
  try {
    confirm = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (confirm.confirmEmail !== auth.user.email) {
    return errorResponse('confirmEmail must match authenticated user email', 400);
  }

  const userId = auth.user.id;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server configuration missing for account deletion', 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ownedVehicles } = await auth.supabase
    .from('vehicles')
    .select('id')
    .eq('user_id', userId);

  for (const vehicle of ownedVehicles ?? []) {
    await admin.from('vehicles').delete().eq('id', vehicle.id);
  }

  await admin.from('device_push_tokens').delete().eq('user_id', userId);
  await admin.from('emergency_contacts').delete().eq('user_id', userId);
  await admin.from('garage_favorites').delete().eq('user_id', userId);
  await admin.from('ai_conversations').delete().eq('user_id', userId);

  const { error: profileError } = await admin.from('profiles').delete().eq('id', userId);
  if (profileError) {
    return errorResponse('Failed to delete profile data', 500);
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return errorResponse('Failed to delete auth user', 500);
  }

  return jsonResponse({
    deleted: true,
    userId,
    message: 'Account and associated data have been deleted.',
  });
});
