import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTheme } from '@/theme';
import { radii, shadows, spacing, typography } from '@/theme/tokens';

type GarageCardProps = {
  name: string;
  district?: string | null;
  distanceKm?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  verified?: boolean;
  openNow?: boolean;
  serviceCategories?: string[];
  onPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
};

export function GarageCard({
  name,
  district,
  distanceKm,
  rating,
  reviewCount,
  verified = false,
  openNow,
  serviceCategories = [],
  onPress,
  onFavoritePress,
  isFavorite = false,
}: GarageCardProps) {
  const { colors } = useTheme();
  const categoryPreview = serviceCategories.slice(0, 2).join(' · ');

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
              {name}
            </Text>
            {verified ? <StatusBadge label="Verified" variant="success" /> : null}
          </View>
          {district ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {district}
            </Text>
          ) : null}
        </View>
        {onFavoritePress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove favorite' : 'Add favorite'}
            hitSlop={8}
            onPress={onFavoritePress}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? colors.danger : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        {rating != null ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={[styles.meta, { color: colors.textPrimary }]}>
              {rating.toFixed(1)}
            </Text>
            {reviewCount != null ? (
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                ({reviewCount})
              </Text>
            ) : null}
          </View>
        ) : null}
        {distanceKm != null ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {distanceKm.toFixed(1)} km away
          </Text>
        ) : null}
        {openNow != null ? (
          <StatusBadge
            label={openNow ? 'Open Now' : 'Closed'}
            variant={openNow ? 'success' : 'neutral'}
          />
        ) : null}
      </View>

      {categoryPreview ? (
        <Text numberOfLines={1} style={[styles.categories, { color: colors.textMuted }]}>
          {categoryPreview}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}${verified ? ', verified garage' : ''}`}
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
    gap: spacing.sm,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyStrong,
    flexShrink: 1,
  },
  subtitle: {
    ...typography.caption,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  meta: {
    ...typography.caption,
  },
  categories: {
    ...typography.micro,
  },
});
