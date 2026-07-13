import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { radii, shadows, spacing, typography } from '@/theme/tokens';
import { formatDisplayDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

type ServiceCardProps = {
  serviceDateIso: string;
  garageName: string;
  summary: string;
  totalAmountMinor: number;
  currencyCode?: string;
  odometerKm?: number | null;
  onPress?: () => void;
};

export function ServiceCard({
  serviceDateIso,
  garageName,
  summary,
  totalAmountMinor,
  currencyCode = 'LKR',
  odometerKm,
  onPress,
}: ServiceCardProps) {
  const { colors } = useTheme();

  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.successMuted }]}>
          <Ionicons name="construct-outline" size={20} color={colors.success} />
        </View>
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
            {garageName}
          </Text>
          <Text numberOfLines={2} style={[styles.summary, { color: colors.textSecondary }]}>
            {summary}
          </Text>
        </View>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>
          {formatMoney(totalAmountMinor, currencyCode)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {formatDisplayDate(serviceDateIso)}
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
        accessibilityLabel={`Service at ${garageName}, ${formatMoney(totalAmountMinor, currencyCode)}`}
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
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyStrong,
  },
  summary: {
    ...typography.caption,
  },
  amount: {
    ...typography.bodyStrong,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: 36 + spacing.sm,
  },
  meta: {
    ...typography.caption,
  },
});
