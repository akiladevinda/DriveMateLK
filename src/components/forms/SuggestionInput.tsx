import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useTheme } from '@/theme';
import { minTouchTarget, radii, spacing, typography } from '@/theme/tokens';

type SuggestionInputProps = Omit<TextInputProps, 'style' | 'onFocus' | 'onBlur'> & {
  label: string;
  error?: string;
  hint?: string;
  suggestions: string[];
  loading?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSelectSuggestion?: (value: string) => void;
};

export function SuggestionInput({
  label,
  error,
  hint,
  suggestions,
  loading = false,
  value,
  onChangeText,
  onFocus,
  onBlur,
  onSelectSuggestion,
  editable = true,
  ...inputProps
}: SuggestionInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const selectingRef = useRef(false);
  const hasError = Boolean(error);

  const showList =
    focused && editable && (loading || suggestions.length > 0);

  return (
    <View style={[styles.container, focused ? styles.containerRaised : null]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: hasError ? colors.danger : focused ? colors.accent : colors.border,
            color: colors.textPrimary,
            opacity: editable ? 1 : 0.6,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          // Allow suggestion press to fire before closing the list.
          setTimeout(() => {
            if (selectingRef.current) {
              selectingRef.current = false;
              return;
            }
            setFocused(false);
            onBlur?.();
          }, 160);
        }}
        {...inputProps}
      />

      {hint && !hasError ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}

      {hasError ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}

      {showList ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          {loading && suggestions.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Looking up suggestions…
              </Text>
            </View>
          ) : null}

          {suggestions.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPressIn={() => {
                selectingRef.current = true;
              }}
              onPress={() => {
                onChangeText?.(item);
                onSelectSuggestion?.(item);
                setFocused(false);
                selectingRef.current = false;
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>{item}</Text>
            </Pressable>
          ))}

          <Text style={[styles.footerHint, { color: colors.textMuted }]}>
            You can also type your own value
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    zIndex: 1,
  },
  containerRaised: {
    zIndex: 20,
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
  hint: {
    ...typography.caption,
  },
  error: {
    ...typography.caption,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  loadingText: {
    ...typography.caption,
  },
  option: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    ...typography.body,
  },
  footerHint: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
