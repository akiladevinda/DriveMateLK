import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { brand, radii, shadows, spacing, typography } from '@/theme/tokens';
import type { Vehicle } from '@/types/database';
import { getVehicleTypeFallbackImage } from '@/utils/vehicle-image';

type HomeVehicleHeroProps = {
  greeting: string;
  vehicle: Vehicle;
  vehicles: Vehicle[];
  nextServiceLabel: string;
  onProfilePress?: () => void;
  onOpenVehicle?: () => void;
  onSelectVehicle?: (vehicleId: string) => void;
};

export function HomeVehicleHero({
  greeting,
  vehicle,
  vehicles,
  nextServiceLabel,
  onProfilePress,
  onOpenVehicle,
  onSelectVehicle,
}: HomeVehicleHeroProps) {
  const { colors, scheme } = useTheme();
  const cardBg = scheme === 'dark' ? brand.offWhite : colors.surface;
  const cardText = brand.navy;
  const cardMuted = '#5B6B7F';

  // Same type PNG used on the add-vehicle success screen (car / van / 3 wheel / bike).
  const vehicleImage = getVehicleTypeFallbackImage(vehicle.vehicle_type);
  const vehicleLabel = vehicle.nickname ?? `${vehicle.make} ${vehicle.model}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.greetingBlock}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>{greeting}</Text>
          <Text style={[styles.brandHint, { color: colors.accent }]}>DriveMate LK</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={onProfilePress}
          style={[styles.avatar, { backgroundColor: colors.surfaceElevated, borderColor: colors.accent }]}
        >
          <Ionicons name="person" size={22} color={colors.accent} />
        </Pressable>
      </View>

      {vehicles.length > 1 ? (
        <View style={styles.switcher}>
          {vehicles.map((item) => {
            const selected = item.id === vehicle.id;
            const label = item.nickname ?? item.make;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelectVehicle?.(item.id)}
                style={[
                  styles.switchChip,
                  {
                    backgroundColor: selected ? brand.green : colors.surface,
                    borderColor: selected ? brand.green : colors.border,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.switchChipText,
                    { color: selected ? brand.white : colors.textPrimary },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${vehicleLabel}`}
        onPress={onOpenVehicle}
        style={[styles.vehicleCard, { backgroundColor: cardBg }, shadows.md]}
      >
        <View style={styles.vehicleHeader}>
          <View style={[styles.imageBadge, { backgroundColor: `${brand.green}14` }]}>
            <Image
              source={vehicleImage}
              style={styles.vehicleThumb}
              resizeMode="contain"
              accessibilityLabel={vehicle.vehicle_type}
            />
          </View>
          <View style={styles.vehicleText}>
            <Text style={[styles.myVehicle, { color: cardMuted }]}>My Vehicle</Text>
            <Text style={[styles.vehicleName, { color: cardText }]} numberOfLines={1}>
              {vehicleLabel}
            </Text>
            <Text style={[styles.plate, { color: brand.green }]}>
              {vehicle.registration_number}
            </Text>
          </View>
        </View>

        <View style={[styles.serviceRow, { backgroundColor: `${brand.green}18` }]}>
          <Ionicons name="calendar-outline" size={18} color={brand.green} />
          <Text style={[styles.serviceText, { color: cardText }]} numberOfLines={2}>
            {nextServiceLabel}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingBlock: {
    flex: 1,
    paddingRight: spacing.md,
  },
  greeting: {
    ...typography.title,
  },
  brandHint: {
    ...typography.caption,
    marginTop: spacing.xxs,
    fontWeight: '600',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcher: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  switchChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    maxWidth: '48%',
  },
  switchChipText: {
    ...typography.caption,
    fontWeight: '700',
  },
  vehicleCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  imageBadge: {
    width: 72,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
  vehicleThumb: {
    width: '100%',
    height: '100%',
  },
  vehicleText: {
    flex: 1,
  },
  myVehicle: {
    ...typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  vehicleName: {
    ...typography.heading,
  },
  plate: {
    ...typography.bodyStrong,
    marginTop: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  serviceText: {
    ...typography.caption,
    flex: 1,
    fontWeight: '600',
  },
});
