import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useTheme } from '@/theme';
import { brand, radii, shadows, spacing, typography } from '@/theme/tokens';

type HomeStatsRowProps = {
  fuelEconomyLabel: string;
  fuelEconomyValue: string;
  expensesLabel: string;
  expensesValue: string;
};

export function HomeStatsRow({
  fuelEconomyLabel,
  fuelEconomyValue,
  expensesLabel,
  expensesValue,
}: HomeStatsRowProps) {
  const { colors, scheme } = useTheme();
  const cardBg = colors.surface;
  const lineColor = brand.green;
  const donutTrack = scheme === 'dark' ? '#2A3A50' : '#E2E8F0';
  const circumference = 2 * Math.PI * 16;
  const fuelPortion = circumference * 0.7;
  const otherPortion = circumference * 0.3;

  return (
    <View style={styles.row}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }, shadows.sm]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{fuelEconomyLabel}</Text>
          <Ionicons name="speedometer-outline" size={18} color={lineColor} />
        </View>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{fuelEconomyValue}</Text>
        <Svg width="100%" height={42} viewBox="0 0 120 42">
          <Polyline
            points="0,32 20,28 40,30 60,18 80,22 100,10 120,14"
            fill="none"
            stroke={lineColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }, shadows.sm]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{expensesLabel}</Text>
          <Ionicons name="wallet-outline" size={18} color={brand.orange} />
        </View>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{expensesValue}</Text>
        <View style={styles.donutWrap}>
          <Svg width={48} height={48} viewBox="0 0 48 48">
            <Circle
              cx={24}
              cy={24}
              r={16}
              stroke={donutTrack}
              strokeWidth={6}
              fill="none"
            />
            <Circle
              cx={24}
              cy={24}
              r={16}
              stroke={lineColor}
              strokeWidth={6}
              fill="none"
              strokeDasharray={`${fuelPortion} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
            />
            <Circle
              cx={24}
              cy={24}
              r={16}
              stroke={brand.orange}
              strokeWidth={6}
              fill="none"
              strokeDasharray={`${otherPortion} ${circumference}`}
              strokeDashoffset={-fuelPortion}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
            />
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  card: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
    minHeight: 140,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.caption,
  },
  value: {
    ...typography.heading,
  },
  donutWrap: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
});
