import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTheme } from '@/theme';
import { radii, shadows, spacing, typography } from '@/theme/tokens';
import type { VehicleType } from '@/types/database';
import { maskRegistration } from '@/utils/mask';
import { getVehicleTypeFallbackImage } from '@/utils/vehicle-image';

type VehicleCardProps = {
  nickname?: string | null;
  make: string;
  model: string;
  registrationNumber: string;
  odometerKm?: number | null;
  healthScore?: number | null;
  imageUri?: string | null;
  vehicleType?: VehicleType | string | null;
  onPress?: () => void;
};

export function VehicleCard({
  nickname,
  make,
  model,
  registrationNumber,
  odometerKm,
  healthScore,
  imageUri,
  vehicleType = 'car',
  onPress,
}: VehicleCardProps) {
  const { colors } = useTheme();
  const title = nickname?.trim() || `${make} ${model}`.trim();
  const maskedRegistration = maskRegistration(registrationNumber);
  const typeImage = getVehicleTypeFallbackImage(vehicleType ?? 'car');
  const hasPhoto = Boolean(imageUri?.trim());

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {maskedRegistration}
          </Text>
        </View>
        {healthScore != null ? (
          <StatusBadge
            label={`${Math.round(healthScore)}/100`}
            variant={
              healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'danger'
            }
          />
        ) : null}
      </View>

      <View style={[styles.imageWrap, { backgroundColor: colors.surfaceMuted }]}>
        {hasPhoto ? (
          <Image
            accessibilityLabel={`${title} photo`}
            contentFit="cover"
            source={{ uri: imageUri! }}
            style={styles.image}
          />
        ) : (
          <Image
            accessibilityLabel={`${title} ${vehicleType ?? 'vehicle'} illustration`}
            contentFit="contain"
            source={typeImage}
            style={styles.typeImage}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {make} {model}
        </Text>
        {odometerKm != null ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {odometerKm.toLocaleString('en-LK')} km
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${maskedRegistration}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          shadows.sm,
          pressed && { opacity: 0.92 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        shadows.sm,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyStrong,
  },
  subtitle: {
    ...typography.caption,
  },
  imageWrap: {
    width: '100%',
    height: 140,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  typeImage: {
    width: '88%',
    height: '88%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  meta: {
    ...typography.caption,
  },
});
