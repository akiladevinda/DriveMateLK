import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ServiceCard } from '@/components/cards';
import {
  AppHeader,
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PrimaryButton,
} from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import * as serviceRecordService from '@/services/service-record-service';
import { spacing } from '@/theme/tokens';

export default function VehicleServicesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();

  const { data: records = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.services(vehicleId ?? ''),
    queryFn: async () => {
      if (!vehicleId) return [];
      const result = await serviceRecordService.listServiceRecords(vehicleId);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(vehicleId && isSupabaseConfigured()),
  });

  return (
    <AppScreen scrollable>
      <AppHeader showBack title="Services" />
      <PrimaryButton label="Add service record" onPress={() => router.push('/services/create')} />

      {isLoading ? <LoadingSkeleton lines={3} /> : null}
      {isError ? (
        <ErrorState message={error?.message ?? t('common.error')} onRetry={() => refetch()} />
      ) : null}

      {!isLoading && records.length === 0 ? (
        <EmptyState
          description="Log garage visits, repairs, and routine servicing."
          icon="build-outline"
          title={t('common.empty')}
        />
      ) : null}

      <View style={styles.list}>
        {records.map((record) => (
          <ServiceCard
            key={record.id}
            currencyCode={record.currency}
            garageName={record.garage_name ?? 'Unknown garage'}
            odometerKm={record.odometer}
            serviceDateIso={record.service_date}
            summary={record.service_type}
            totalAmountMinor={record.total_cost_minor}
          />
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});
