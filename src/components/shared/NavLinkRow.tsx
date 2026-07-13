import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme';
import { radii, spacing, typography } from '@/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type NavLinkRowProps = {
  label: string;
  subtitle?: string;
  icon?: IoniconName;
  onPress: () => void;
  destructive?: boolean;
  rightElement?: ReactNode;
};

export function NavLinkRow({
  label,
  subtitle,
  icon,
  onPress,
  destructive = false,
  rightElement,
}: NavLinkRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons
            name={icon}
            size={20}
            color={destructive ? colors.danger : colors.accent}
          />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text
          style={[
            styles.label,
            { color: destructive ? colors.danger : colors.textPrimary },
          ]}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {rightElement ?? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  label: {
    ...typography.bodyStrong,
  },
  subtitle: {
    ...typography.caption,
  },
});
