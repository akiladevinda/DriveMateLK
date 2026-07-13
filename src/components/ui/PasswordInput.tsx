import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TextInputProps } from 'react-native';

import { FormInput } from '@/components/ui/FormInput';
import { useTheme } from '@/theme';
import { hitSlop, spacing } from '@/theme/tokens';

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  label?: string;
  error?: string;
  tone?: 'default' | 'dark';
};

export function PasswordInput({
  label = 'Password',
  error,
  tone = 'default',
  ...inputProps
}: PasswordInputProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <FormInput
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
        label={label}
        secureTextEntry={!visible}
        textContentType="password"
        tone={tone}
        {...inputProps}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={hitSlop}
        onPress={() => setVisible((current) => !current)}
        style={styles.toggle}
      >
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={tone === 'dark' ? 'rgba(245,247,250,0.65)' : colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  toggle: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.lg + spacing.xs,
    padding: spacing.xs,
  },
});
