import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AuthScreenShell, authFonts } from '@/components/auth/AuthScreenShell';
import { FormInput, PrimaryButton } from '@/components/ui';
import { useTranslation } from '@/localization';
import * as authService from '@/services/auth-service';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/schemas/auth';
import { brand, spacing } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authService.resetPassword(data.email);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setMessage('If an account exists for this email, a reset link has been sent.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <AuthScreenShell
      showBack
      headline="Reset password"
      supporting="Enter your email and we’ll send a reset link if an account exists."
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            autoCapitalize="none"
            error={errors.email?.message}
            keyboardType="email-address"
            label={t('auth.email')}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="you@email.com"
            tone="dark"
            value={value}
          />
        )}
      />
      {error ? (
        <Animated.Text entering={FadeIn} style={styles.error}>
          {error}
        </Animated.Text>
      ) : null}
      {message ? (
        <Animated.Text entering={FadeIn} style={styles.success}>
          {message}
        </Animated.Text>
      ) : null}
      <PrimaryButton
        label={t('auth.resetPassword')}
        loading={loading}
        onPress={onSubmit}
        style={styles.cta}
      />
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  error: {
    fontFamily: authFonts.caption,
    fontSize: 13,
    color: '#FF8A80',
  },
  success: {
    fontFamily: authFonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: brand.green,
    marginBottom: spacing.xs,
  },
  cta: {
    marginTop: spacing.xs,
  },
});
