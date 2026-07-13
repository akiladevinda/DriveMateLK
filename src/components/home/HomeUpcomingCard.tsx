import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { brand, radii, shadows, spacing, typography } from '@/theme/tokens';

type HomeUpcomingCardProps = {
  title: string;
  subtitle: string;
  badge?: string;
  onPress?: () => void;
};

export function HomeUpcomingCard({ title, subtitle, badge, onPress }: HomeUpcomingCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
        shadows.sm,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${brand.orange}22` }]}>
        <Ionicons name="alarm-outline" size={22} color={brand.orange} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.kicker, { color: colors.textMuted }]}>Upcoming</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: `${brand.green}22` }]}>
          <Text style={[styles.badgeText, { color: brand.green }]}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    ...typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.bodyStrong,
  },
  subtitle: {
    ...typography.caption,
  },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    ...typography.micro,
    fontWeight: '700',
  },
});
