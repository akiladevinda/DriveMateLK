import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useTheme } from '@/theme';
import { radii, spacing, typography } from '@/theme/tokens';

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[styles.container, { backgroundColor: colors.dangerMuted }]}
    >
      <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {onRetry ? (
        <PrimaryButton label={retryLabel} onPress={onRetry} style={styles.button} />
      ) : null}
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
  title: {
    ...typography.heading,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});
