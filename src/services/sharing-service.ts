import * as Crypto from 'expo-crypto';
import { addDays } from 'date-fns';

import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { InviteMemberInput } from '@/schemas/sharing';
import type {
  TablesInsert,
  VehicleInvitation,
  VehicleMember,
  VehicleMemberRole,
} from '@/types/database';

export type SharingServiceError = { message: string; code?: string };
export type SharingResult<T> = { data: T; error: null } | { data: null; error: SharingServiceError };

export type MemberListItem =
  | { kind: 'member'; member: VehicleMember; email?: string | null }
  | { kind: 'invitation'; invitation: VehicleInvitation };

function mapError(error: { message: string; code?: string } | null): SharingServiceError | null {
  if (!error) return null;
  return { message: error.message, code: error.code ?? 'sharing_error' };
}

async function hashToken(token: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token);
}

function generateToken(): string {
  const bytes = Crypto.getRandomBytes(24);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function inviteMember(
  userId: string,
  input: InviteMemberInput,
): Promise<SharingResult<{ invitation: VehicleInvitation; inviteToken: string }>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const email = input.email.trim().toLowerCase();
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id,email')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile?.id) {
    const memberPayload: TablesInsert<'vehicle_members'> = {
      vehicle_id: input.vehicle_id,
      user_id: existingProfile.id,
      role: input.role,
      invited_by: userId,
      accepted_at: new Date().toISOString(),
      permissions: {},
    };

    const { data: member, error: memberError } = await supabase
      .from('vehicle_members')
      .insert(memberPayload)
      .select('*')
      .single();

    const mapped = mapError(memberError);
    if (mapped || !member) {
      return {
        data: null,
        error: mapped ?? { message: 'Failed to add member', code: 'invite_failed' },
      };
    }

    const syntheticInvitation: VehicleInvitation = {
      id: member.id,
      vehicle_id: input.vehicle_id,
      invited_by: userId,
      invitee_email: email,
      role: input.role,
      token_hash: '',
      expires_at: new Date().toISOString(),
      accepted_at: member.accepted_at,
      revoked_at: null,
      created_at: member.created_at,
      updated_at: member.updated_at,
    };

    return { data: { invitation: syntheticInvitation, inviteToken: '' }, error: null };
  }

  const inviteToken = generateToken();
  const tokenHash = await hashToken(inviteToken);
  const payload: TablesInsert<'vehicle_invitations'> = {
    vehicle_id: input.vehicle_id,
    invited_by: userId,
    invitee_email: email,
    role: input.role,
    token_hash: tokenHash,
    expires_at: addDays(new Date(), 14).toISOString(),
  };

  const { data, error } = await supabase
    .from('vehicle_invitations')
    .insert(payload)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to create invitation', code: 'invite_failed' },
    };
  }

  return { data: { invitation: data, inviteToken }, error: null };
}

export async function listMembers(
  vehicleId: string,
): Promise<SharingResult<MemberListItem[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const [membersRes, invitationsRes] = await Promise.all([
    supabase
      .from('vehicle_members')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: true }),
    supabase
      .from('vehicle_invitations')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
  ]);

  const membersError = mapError(membersRes.error);
  if (membersError) return { data: null, error: membersError };

  const invitationsError = mapError(invitationsRes.error);
  if (invitationsError) return { data: null, error: invitationsError };

  const memberUserIds = (membersRes.data ?? []).map((m) => m.user_id);
  let emailByUserId: Record<string, string> = {};

  if (memberUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,email')
      .in('id', memberUserIds);
    emailByUserId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.email]));
  }

  const items: MemberListItem[] = [
    ...(membersRes.data ?? []).map((member) => ({
      kind: 'member' as const,
      member,
      email: emailByUserId[member.user_id] ?? null,
    })),
    ...(invitationsRes.data ?? []).map((invitation) => ({
      kind: 'invitation' as const,
      invitation,
    })),
  ];

  return { data: items, error: null };
}

export async function revokeMember(
  vehicleId: string,
  target: { kind: 'member'; memberId: string } | { kind: 'invitation'; invitationId: string },
): Promise<SharingResult<null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  if (target.kind === 'member') {
    const { error } = await supabase
      .from('vehicle_members')
      .delete()
      .eq('id', target.memberId)
      .eq('vehicle_id', vehicleId);

    const mapped = mapError(error);
    if (mapped) return { data: null, error: mapped };
    return { data: null, error: null };
  }

  const { error } = await supabase
    .from('vehicle_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', target.invitationId)
    .eq('vehicle_id', vehicleId);

  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  return { data: null, error: null };
}

/**
 * Accepts a pending invitation by token. Requires invitee email to match the signed-in user.
 * Production may move this behind an Edge Function to bypass manager-only invitation RLS.
 */
export async function acceptInvitation(
  userId: string,
  token: string,
): Promise<SharingResult<VehicleMember>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  const profileMapped = mapError(profileError);
  if (profileMapped || !profile?.email) {
    return {
      data: null,
      error: profileMapped ?? { message: 'Profile not found', code: 'profile_not_found' },
    };
  }

  const tokenHash = await hashToken(token.trim());
  const { data: invitation, error: inviteError } = await supabase
    .from('vehicle_invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('invitee_email', profile.email.trim().toLowerCase())
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  const inviteMapped = mapError(inviteError);
  if (inviteMapped) return { data: null, error: inviteMapped };
  if (!invitation) {
    return { data: null, error: { message: 'Invitation not found or expired', code: 'not_found' } };
  }

  const memberPayload: TablesInsert<'vehicle_members'> = {
    vehicle_id: invitation.vehicle_id,
    user_id: userId,
    role: invitation.role as VehicleMemberRole,
    invited_by: invitation.invited_by,
    accepted_at: new Date().toISOString(),
    permissions: {},
  };

  const { data: member, error: memberError } = await supabase
    .from('vehicle_members')
    .insert(memberPayload)
    .select('*')
    .single();

  const memberMapped = mapError(memberError);
  if (memberMapped || !member) {
    return {
      data: null,
      error: memberMapped ?? { message: 'Failed to accept invitation', code: 'accept_failed' },
    };
  }

  await supabase
    .from('vehicle_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  return { data: member, error: null };
}
