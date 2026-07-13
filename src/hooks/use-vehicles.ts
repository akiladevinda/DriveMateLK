import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import * as vehicleService from '@/services/vehicle-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';

export function useVehicles() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.vehicles(user?.id ?? 'anonymous'),
    queryFn: async () => {
      if (!user) {
        return [];
      }
      const result = await vehicleService.listVehicles(user.id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: Boolean(user),
  });
}

export function useActiveVehicle() {
  const { data: vehicles = [], isLoading, isError, error, refetch } = useVehicles();
  const activeVehicleId = useSettingsStore((s) => s.activeVehicleId);
  const setActiveVehicleId = useSettingsStore((s) => s.setActiveVehicleId);

  const activeVehicle =
    vehicles.find((v) => v.id === activeVehicleId) ??
    vehicles.find((v) => v.is_primary) ??
    vehicles[0] ??
    null;

  return {
    vehicles,
    activeVehicle,
    activeVehicleId: activeVehicle?.id ?? null,
    setActiveVehicleId,
    isLoading,
    isError,
    error,
    refetch,
  };
}
