import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';
import { minTouchTarget, radii, spacing, typography } from '@/theme/tokens';

type FormInputProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** Use on navy/auth surfaces for correct contrast. */
  tone?: 'default' | 'dark';
};

export function FormInput({
  label,
  error,
  containerStyle,
  editable = true,
  tone = 'default',
  ...inputProps
}: FormInputProps) {
  const { colors } = useTheme();
  const hasError = Boolean(error);
  const isDark = tone === 'dark';

  const labelColor = isDark ? 'rgba(245,247,250,0.7)' : colors.textSecondary;
  const inputBg = isDark ? 'rgba(7, 17, 28, 0.55)' : colors.surface;
  const borderColor = hasError
    ? colors.danger
    : isDark
      ? 'rgba(255,255,255,0.12)'
      : colors.border;
  const textColor = isDark ? '#F5F7FA' : colors.textPrimary;
  const placeholder = isDark ? 'rgba(245,247,250,0.35)' : colors.textMuted;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        placeholderTextColor={placeholder}
        style={[
          styles.input,
          {
            backgroundColor: inputBg,
            borderColor,
            color: textColor,
            opacity: editable ? 1 : 0.6,
          },
        ]}
        {...inputProps}
      />
      {hasError ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: colors.danger }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
  },
  input: {
    ...typography.body,
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  error: {
    ...typography.caption,
  },
});
