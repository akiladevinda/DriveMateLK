import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategoryValue,
} from '@/constants/expenses';
import { useTheme } from '@/theme';
import { radii, shadows, spacing, typography } from '@/theme/tokens';
import { formatDisplayDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

type ExpenseCardProps = {
  title: string;
  category: ExpenseCategoryValue;
  amountMinor: number;
  currencyCode?: string;
  dateIso: string;
  notes?: string | null;
  onPress?: () => void;
};

export function ExpenseCard({
  title,
  category,
  amountMinor,
  currencyCode = 'LKR',
  dateIso,
  notes,
  onPress,
}: ExpenseCardProps) {
  const { colors } = useTheme();
  const categoryLabel = EXPENSE_CATEGORY_LABELS[category];

  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.warningMuted }]}>
          <Ionicons name="wallet-outline" size={20} color={colors.warning} />
        </View>
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.category, { color: colors.textSecondary }]}>
            {categoryLabel}
          </Text>
        </View>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>
          {formatMoney(amountMinor, currencyCode)}
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.date, { color: colors.textMuted }]}>
          {formatDisplayDate(dateIso)}
        </Text>
        {notes ? (
          <Text numberOfLines={1} style={[styles.notes, { color: colors.textSecondary }]}>
            {notes}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${formatMoney(amountMinor, currencyCode)}`}
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
  category: {
    ...typography.caption,
  },
  amount: {
    ...typography.bodyStrong,
  },
  footer: {
    paddingLeft: 36 + spacing.sm,
    gap: spacing.xxs,
  },
  date: {
    ...typography.caption,
  },
  notes: {
    ...typography.micro,
  },
});
