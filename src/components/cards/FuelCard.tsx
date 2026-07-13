import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { radii, shadows, spacing, typography } from '@/theme/tokens';
import { formatDisplayDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

type FuelCardProps = {
  dateIso: string;
  litres: number;
  totalAmountMinor: number;
  currencyCode?: string;
  stationName?: string | null;
  odometerKm?: number | null;
  economyKmpl?: number | null;
  isFullTank?: boolean;
  onPress?: () => void;
};

export function FuelCard({
  dateIso,
  litres,
  totalAmountMinor,
  currencyCode = 'LKR',
  stationName,
  odometerKm,
  economyKmpl,
  isFullTank = true,
  onPress,
}: FuelCardProps) {
  const { colors } = useTheme();

  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentMuted }]}>
          <Ionicons name="water-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {litres.toFixed(2)} L
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {stationName ?? 'Fuel entry'}
            {isFullTank ? '' : ' · Partial fill'}
          </Text>
        </View>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>
          {formatMoney(totalAmountMinor, currencyCode)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {formatDisplayDate(dateIso)}
        </Text>
        {odometerKm != null ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {odometerKm.toLocaleString('en-LK')} km
          </Text>
        ) : null}
        {economyKmpl != null ? (
          <Text style={[styles.meta, { color: colors.success }]}>
            {economyKmpl.toFixed(1)} km/L
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Fuel entry, ${litres} litres, ${formatMoney(totalAmountMinor, currencyCode)}`}
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
  subtitle: {
    ...typography.caption,
  },
  amount: {
    ...typography.bodyStrong,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingLeft: 36 + spacing.sm,
  },
  meta: {
    ...typography.caption,
  },
});
