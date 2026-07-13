import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';

import {
  AppHeader,
  AppScreen,
  EmptyState,
  ErrorState,
  FormInput,
  LoadingSkeleton,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import { isSupabaseConfigured } from '@/lib/env';
import { useTranslation } from '@/localization';
import { inviteMemberSchema, type InviteMemberInput } from '@/schemas/sharing';
import * as sharingService from '@/services/sharing-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';

const ROLES = ['owner', 'manager', 'driver', 'viewer', 'emergency_only'] as const;

export default function VehicleSharingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<InviteMemberInput['role']>('viewer');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: createZodResolver(inviteMemberSchema),
    defaultValues: { vehicle_id: vehicleId ?? '', email: '', role: 'viewer' },
  });

  const { data: members = [], isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: queryKeys.sharing(vehicleId ?? ''),
    queryFn: async () => {
      if (!vehicleId) return [];
      const result = await sharingService.listMembers(vehicleId);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(vehicleId && isSupabaseConfigured()),
  });

  const onInvite = handleSubmit(async (data) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await sharingService.inviteMember(user.id, { ...data, role });
      if (result.error || !result.data) {
        setError(result.error?.message ?? t('common.error'));
        return;
      }
      if (result.data.inviteToken) {
        Alert.alert(
          'Invitation created',
          `Share this token with ${data.email}:\n\n${result.data.inviteToken}`,
        );
      }
      reset({ vehicle_id: vehicleId ?? '', email: '', role: 'viewer' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sharing(vehicleId ?? '') });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  const revoke = async (item: sharingService.MemberListItem) => {
    if (!vehicleId) return;
    const target =
      item.kind === 'member'
        ? { kind: 'member' as const, memberId: item.member.id }
        : { kind: 'invitation' as const, invitationId: item.invitation.id };
    const result = await sharingService.revokeMember(vehicleId, target);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.sharing(vehicleId) });
  };

  if (!isSupabaseConfigured()) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title={t('vehicles.sharing')} />
        <EmptyState
          description="Connect Supabase to invite family members and drivers."
          icon="cloud-offline-outline"
          title="Backend not configured"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('vehicles.sharing')} />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Invite by email. Existing users are added immediately; others receive a token to accept.
      </Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              autoCapitalize="none"
              error={errors.email?.message}
              keyboardType="email-address"
              label="Email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Role</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => (
            <SecondaryButton
              key={r}
              label={r.replace(/_/g, ' ')}
              onPress={() => setRole(r)}
              style={role === r ? { borderColor: colors.accent } : undefined}
            />
          ))}
        </View>
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <PrimaryButton label="Send invitation" loading={loading} onPress={onInvite} />
      </View>

      {isLoading ? <LoadingSkeleton lines={3} /> : null}
      {isError ? (
        <ErrorState message={queryError?.message ?? t('common.error')} onRetry={() => refetch()} />
      ) : null}

      {!isLoading && !isError && members.length === 0 ? (
        <EmptyState
          description="Invite family or drivers to view or manage this vehicle."
          icon="people-outline"
          title={t('common.empty')}
        />
      ) : null}

      <View style={styles.list}>
        {members.map((item) => {
          const key = item.kind === 'member' ? item.member.id : item.invitation.id;
          const label =
            item.kind === 'member'
              ? item.email ?? item.member.user_id.slice(0, 8)
              : item.invitation.invitee_email;
          const roleLabel =
            item.kind === 'member' ? item.member.role : item.invitation.role;
          const status = item.kind === 'invitation' ? 'pending' : 'active';

          return (
            <View
              key={key}
              style={[styles.memberRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.memberInfo}>
                <Text style={[styles.memberEmail, { color: colors.textPrimary }]}>{label}</Text>
                <Text style={[styles.memberMeta, { color: colors.textMuted }]}>
                  {roleLabel.replace(/_/g, ' ')}
                </Text>
              </View>
              <StatusBadge label={status} variant={status === 'pending' ? 'warning' : 'success'} />
              <SecondaryButton label="Revoke" onPress={() => void revoke(item)} />
            </View>
          );
        })}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.caption,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  error: {
    ...typography.caption,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  memberRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  memberInfo: {
    gap: spacing.xxs,
  },
  memberEmail: {
    ...typography.bodyStrong,
  },
  memberMeta: {
    ...typography.caption,
    textTransform: 'capitalize',
  },
});
