import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { FuelCard } from '@/components/cards';
import { AppHeader, AppScreen, ErrorState, LoadingSkeleton } from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import * as fuelService from '@/services/fuel-service';
import { useAuthStore } from '@/stores/auth-store';

export default function FuelEntryDetailScreen() {
  const { fuelEntryId } = useLocalSearchParams<{ fuelEntryId: string }>();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['fuel-entry', fuelEntryId],
    queryFn: async () => {
      if (!user || !fuelEntryId) throw new Error('Not found');
      const result = await fuelService.getFuelEntry(user.id, fuelEntryId);
      if (result.error || !result.data) throw new Error(result.error?.message);
      return result.data;
    },
    enabled: Boolean(user && fuelEntryId),
  });

  return (
    <AppScreen scrollable>
      <AppHeader showBack title="Fuel entry" />
      {isLoading ? <LoadingSkeleton lines={3} /> : null}
      {isError ? <ErrorState message={error?.message ?? 'Error'} onRetry={() => refetch()} /> : null}
      {data ? (
        <FuelCard
          currencyCode={data.currency}
          dateIso={data.entry_date}
          isFullTank={data.is_full_tank}
          litres={data.litres}
          odometerKm={data.odometer}
          stationName={data.fuel_station}
          totalAmountMinor={data.total_amount_minor}
        />
      ) : null}
    </AppScreen>
  );
}
