import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

import { AppHeader, AppScreen, PrimaryButton } from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { createRequest } from '@/services/roadside-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { radii, spacing, typography } from '@/theme/tokens';
import type { RoadsideRequestType } from '@/types/database';
import { getErrorMessage } from '@/utils/errors';

const REQUEST_TYPES: { type: RoadsideRequestType; label: string }[] = [
  { type: 'towing', label: 'Towing' },
  { type: 'flat_tire', label: 'Flat tire' },
  { type: 'battery_jump', label: 'Battery jump' },
  { type: 'fuel_delivery', label: 'Fuel delivery' },
  { type: 'lockout', label: 'Lockout' },
  { type: 'mechanical_breakdown', label: 'Breakdown' },
];

export default function RoadsideRequestScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { activeVehicle } = useActiveVehicle();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<RoadsideRequestType>('towing');
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user || !activeVehicle) throw new Error('Sign in and select a vehicle first.');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission is required for dispatch.');

      const position = await Location.getCurrentPositionAsync({});
      const result = await createRequest({
        userId: user.id,
        vehicleId: activeVehicle.id,
        requestType: selected,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      if (user) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.roadside(user.id) });
      }
      router.replace('/roadside/active-request');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <AppScreen scrollable>
      <AppHeader showBack title="Request roadside help" />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Select the type of assistance needed. A demo provider will simulate status updates.
      </Text>

      <View style={styles.options}>
        {REQUEST_TYPES.map((item) => {
          const active = selected === item.type;
          return (
            <Pressable
              key={item.type}
              onPress={() => setSelected(item.type)}
              style={[
                styles.option,
                {
                  backgroundColor: active ? colors.accentMuted : colors.surface,
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
            >
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PrimaryButton label="Submit request" loading={submit.isPending} onPress={() => submit.mutate()} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  optionLabel: {
    ...typography.caption,
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
});
