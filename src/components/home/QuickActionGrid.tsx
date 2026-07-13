import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme';
import { brand, minTouchTarget, radii, spacing, typography } from '@/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type QuickActionItem = {
  key: string;
  label: string;
  icon: IoniconName;
  onPress: () => void;
};

type QuickActionGridProps = {
  actions: QuickActionItem[];
};

export function QuickActionGrid({ actions }: QuickActionGridProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={({ pressed }) => [styles.item, { opacity: pressed ? 0.85 : 1 }]}
        >
          <View
            style={[
              styles.circle,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.accent,
              },
            ]}
          >
            <Ionicons name={action.icon} size={26} color={colors.accent} />
          </View>
          <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={2}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: minTouchTarget + 28,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.navySurface,
  },
  label: {
    ...typography.micro,
    textAlign: 'center',
    fontWeight: '600',
  },
});
