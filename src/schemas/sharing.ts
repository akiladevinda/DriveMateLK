import { z } from 'zod';

export const vehicleMemberRoleSchema = z.enum([
  'owner',
  'manager',
  'driver',
  'viewer',
  'emergency_only',
]);

export const inviteMemberSchema = z.object({
  vehicle_id: z.uuid(),
  email: z.string().trim().email().max(120),
  role: vehicleMemberRoleSchema.default('viewer'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().trim().min(16).max(128),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
