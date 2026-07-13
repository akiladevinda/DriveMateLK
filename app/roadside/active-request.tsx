import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { AppHeader, AppScreen, EmptyState, LoadingSkeleton, PrimaryButton, SecondaryButton, StatusBadge } from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import { cancelRequest, getActiveRequest, getMockRoadsideProvider } from '@/services/roadside-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';

const STATUS_LABELS: Record<string, string> = {
  requested: 'Request received',
  assigned: 'Provider assigned',
  on_the_way: 'On the way',
  arrived: 'Provider arrived',
  in_progress: 'Assistance in progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ActiveRoadsideRequestScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const mockProvider = getMockRoadsideProvider();

  const { data: request, isLoading, refetch } = useQuery({
    queryKey: queryKeys.roadside(user?.id ?? 'anonymous'),
    queryFn: async () => {
      if (!user) return null;
      const result = await getActiveRequest(user.id);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(user),
    refetchInterval: 3000,
  });

  const cancel = useMutation({
    mutationFn: async () => {
      if (!user || !request) throw new Error('No active request');
      const result = await cancelRequest(user.id, request.id);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: queryKeys.roadside(user.id) });
      router.replace('/roadside');
    },
  });

  if (isLoading) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Active request" />
        <LoadingSkeleton lines={3} />
      </AppScreen>
    );
  }

  if (!request) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Active request" />
        <EmptyState
          description="Start a new request from the roadside hub."
          icon="help-buoy-outline"
          title="No active request"
        />
        <PrimaryButton label="Request help" onPress={() => router.push('/roadside/request')} />
      </AppScreen>
    );
  }

  const eta = mockProvider.estimateArrivalMinutes(request.status);

  return (
    <AppScreen scrollable>
      <AppHeader showBack title="Active request" />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.type, { color: colors.textPrimary }]}>
          {request.request_type.replace(/_/g, ' ')}
        </Text>
        <StatusBadge label={STATUS_LABELS[request.status] ?? request.status} variant="info" />
        {eta != null ? (
          <Text style={[styles.eta, { color: colors.textSecondary }]}>Est. ~{eta} min (demo simulation)</Text>
        ) : null}
        {request.address ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>{request.address}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <SecondaryButton label="Refresh" onPress={() => refetch()} />
        {request.status !== 'completed' && request.status !== 'cancelled' ? (
          <SecondaryButton label="Cancel request" loading={cancel.isPending} onPress={() => cancel.mutate()} />
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  type: {
    ...typography.title,
    textTransform: 'capitalize',
  },
  eta: {
    ...typography.caption,
  },
  meta: {
    ...typography.caption,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
