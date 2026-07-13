import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useTheme } from '@/theme';
import { radii, spacing, typography } from '@/theme/tokens';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon = 'folder-open-outline',
  actionLabel,
  onAction,
  action,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="text"
      style={[styles.container, { backgroundColor: colors.surfaceMuted }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={32} color={colors.textMuted} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {action ??
        (actionLabel && onAction ? (
          <PrimaryButton label={actionLabel} onPress={onAction} style={styles.button} />
        ) : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radii.lg,
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.heading,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});
