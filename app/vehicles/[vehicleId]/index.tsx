import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { VehicleCard } from '@/components/cards';
import { NavLinkRow } from '@/components/shared/NavLinkRow';
import {
  AppHeader,
  AppScreen,
  ErrorState,
  LoadingSkeleton,
} from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import * as vehicleService from '@/services/vehicle-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';

export default function VehicleDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();

  const { data: vehicle, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.vehicle(vehicleId ?? ''),
    queryFn: async () => {
      if (!user || !vehicleId) {
        throw new Error('Vehicle not found');
      }
      const result = await vehicleService.getVehicle(user.id, vehicleId);
      if (result.error || !result.data) {
        throw new Error(result.error?.message ?? 'Vehicle not found');
      }
      return result.data;
    },
    enabled: Boolean(user && vehicleId),
  });

  const sections = [
    { label: t('vehicles.documents'), href: `/vehicles/${vehicleId}/documents` },
    { label: t('vehicles.maintenance'), href: `/vehicles/${vehicleId}/maintenance` },
    { label: 'Services', href: `/vehicles/${vehicleId}/services` },
    { label: 'Fuel', href: `/vehicles/${vehicleId}/fuel` },
    { label: t('vehicles.expenses'), href: `/vehicles/${vehicleId}/expenses` },
    { label: t('vehicles.analytics'), href: `/vehicles/${vehicleId}/analytics` },
    { label: t('vehicles.timeline'), href: `/vehicles/${vehicleId}/timeline` },
    { label: t('vehicles.sharing'), href: `/vehicles/${vehicleId}/sharing` },
  ];

  return (
    <AppScreen scrollable>
      <AppHeader
        showBack
        subtitle={vehicle?.registration_number}
        title={vehicle ? `${vehicle.make} ${vehicle.model}` : t('vehicles.overview')}
      />

      {isLoading ? <LoadingSkeleton lines={4} /> : null}
      {isError ? (
        <ErrorState message={error?.message ?? t('common.error')} onRetry={() => refetch()} />
      ) : null}

      {vehicle ? (
        <>
          <VehicleCard
            healthScore={75}
            imageUri={vehicle.main_image_url}
            make={vehicle.make}
            model={vehicle.model}
            nickname={vehicle.nickname}
            odometerKm={vehicle.current_odometer}
            registrationNumber={vehicle.registration_number}
            vehicleType={vehicle.vehicle_type}
          />
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {t('vehicles.registration')}: {vehicle.registration_number}
          </Text>
          <NavLinkRow
            icon="create-outline"
            label={t('common.edit')}
            onPress={() => router.push(`/vehicles/${vehicleId}/edit` as Href)}
          />
          <View style={styles.sections}>
            {sections.map((section) => (
              <NavLinkRow
                key={section.href}
                label={section.label}
                onPress={() => router.push(section.href as Href)}
              />
            ))}
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  meta: {
    ...typography.caption,
    marginVertical: spacing.md,
  },
  sections: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});
