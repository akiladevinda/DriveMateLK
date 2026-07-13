import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { VehicleCard } from '@/components/cards';
import {
  AppHeader,
  AppScreen,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingSkeleton,
} from '@/components/ui';
import { useVehicles } from '@/hooks/use-vehicles';
import { useTranslation } from '@/localization';

export default function VehiclesTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: vehicles = [], isLoading, isError, error, refetch } = useVehicles();

  return (
    <AppScreen scrollable>
      <AppHeader
        rightAction={
          <IconButton
            accessibilityLabel={t('vehicles.add')}
            icon="add"
            onPress={() => router.push('/vehicles/create')}
          />
        }
        title={t('vehicles.title')}
      />

      {isLoading ? <LoadingSkeleton lines={4} /> : null}

      {isError ? (
        <ErrorState message={error?.message ?? t('common.error')} onRetry={() => refetch()} />
      ) : null}

      {!isLoading && !isError && vehicles.length === 0 ? (
        <EmptyState
          actionLabel={t('vehicles.add')}
          description={t('vehicles.emptyBody')}
          icon="car-outline"
          onAction={() => router.push('/vehicles/create')}
          title={t('vehicles.emptyTitle')}
        />
      ) : null}

      <View style={styles.list}>
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            healthScore={75}
            imageUri={vehicle.main_image_url}
            make={vehicle.make}
            model={vehicle.model}
            nickname={vehicle.nickname}
            odometerKm={vehicle.current_odometer}
            onPress={() => router.push(`/vehicles/${vehicle.id}`)}
            registrationNumber={vehicle.registration_number}
            vehicleType={vehicle.vehicle_type}
          />
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
    paddingBottom: 32,
  },
});
