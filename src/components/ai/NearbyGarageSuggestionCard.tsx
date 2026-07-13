import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { NearbyGarageSuggestion } from '@/services/nearby-garages-service';
import { useTheme } from '@/theme';
import { brand, radii, spacing, typography } from '@/theme/tokens';
import { openMapsNavigation, openPhoneCall } from '@/utils/linking';

type Props = {
  garage: NearbyGarageSuggestion;
};

export function NearbyGarageSuggestionCard({ garage }: Props) {
  const { colors } = useTheme();
  const canCall = Boolean(garage.phone?.trim());
  const canNavigate =
    Number.isFinite(garage.latitude) && Number.isFinite(garage.longitude);

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.top}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{garage.name}</Text>
        <View style={styles.metaRow}>
          {garage.rating != null ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={[styles.meta, { color: colors.textPrimary }]}>
                {garage.rating.toFixed(1)}
              </Text>
              {garage.reviewCount > 0 ? (
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  ({garage.reviewCount})
                </Text>
              ) : null}
            </View>
          ) : null}
          {garage.distanceKm != null ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {garage.distanceKm.toFixed(1)} km
            </Text>
          ) : null}
          <Text style={[styles.source, { color: colors.textMuted }]}>
            {garage.source === 'google_places' ? 'Google' : 'DriveMate'}
          </Text>
        </View>
        {garage.address ? (
          <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
            {garage.address}
            {garage.district ? ` · ${garage.district}` : ''}
          </Text>
        ) : null}
        {garage.matchReason ? (
          <Text style={[styles.match, { color: colors.textMuted }]}>{garage.matchReason}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Call ${garage.name}`}
          disabled={!canCall}
          onPress={() => void openPhoneCall(garage.phone!)}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: canCall ? brand.green : colors.border,
              opacity: pressed && canCall ? 0.9 : 1,
            },
          ]}
        >
          <Ionicons name="call" size={16} color={brand.white} />
          <Text style={styles.actionLabel}>Call</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Navigate to ${garage.name}`}
          disabled={!canNavigate}
          onPress={() =>
            void openMapsNavigation({
              latitude: garage.latitude,
              longitude: garage.longitude,
              label: garage.name,
            })
          }
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: canNavigate ? brand.navy : colors.border,
              opacity: pressed && canNavigate ? 0.9 : 1,
            },
          ]}
        >
          <Ionicons name="navigate" size={16} color={brand.white} />
          <Text style={styles.actionLabel}>Navigate</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  top: {
    gap: spacing.xs,
  },
  name: {
    ...typography.bodyStrong,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    ...typography.caption,
  },
  source: {
    ...typography.micro,
    textTransform: 'uppercase',
  },
  address: {
    ...typography.caption,
  },
  match: {
    ...typography.micro,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
  },
  actionLabel: {
    ...typography.caption,
    color: brand.white,
    fontWeight: '700',
  },
});
