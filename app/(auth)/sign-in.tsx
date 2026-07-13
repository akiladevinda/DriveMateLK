import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AuthScreenShell, authFonts } from '@/components/auth/AuthScreenShell';
import { FormInput, PasswordInput, PrimaryButton } from '@/components/ui';
import { useTranslation } from '@/localization';
import { signInSchema, type SignInInput } from '@/schemas/auth';
import { useAuthStore } from '@/stores/auth-store';
import { brand, spacing } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

export default function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    clearError();
    setLocalError(null);
    try {
      const ok = await signIn(data.email, data.password);
      if (!ok) {
        setLocalError(storeError ?? t('common.error'));
        return;
      }
      router.replace('/');
    } catch (error) {
      setLocalError(getErrorMessage(error));
    }
  });

  return (
    <AuthScreenShell
      headline="Welcome back"
      supporting={t('tagline')}
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email?.message}
            keyboardType="email-address"
            label={t('auth.email')}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="you@email.com"
            textContentType="emailAddress"
            tone="dark"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput
            error={errors.password?.message}
            label={t('auth.password')}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Your password"
            tone="dark"
            value={value}
          />
        )}
      />

      <View style={styles.rowBetween}>
        <View />
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.linkMuted}>{t('auth.forgotPassword')}</Text>
          </Pressable>
        </Link>
      </View>

      {localError || storeError ? (
        <Animated.Text entering={FadeIn} style={styles.error}>
          {localError ?? storeError}
        </Animated.Text>
      ) : null}

      <PrimaryButton label={t('auth.signIn')} loading={isLoading} onPress={onSubmit} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.linkAccent}>{t('auth.signUp')}</Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -spacing.sm,
  },
  linkMuted: {
    fontFamily: authFonts.caption,
    fontSize: 13,
    color: 'rgba(245,247,250,0.65)',
  },
  linkAccent: {
    fontFamily: authFonts.bodyStrong,
    fontSize: 15,
    color: brand.green,
  },
  error: {
    fontFamily: authFonts.caption,
    fontSize: 13,
    color: '#FF8A80',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  footerText: {
    fontFamily: authFonts.body,
    fontSize: 14,
    color: 'rgba(245,247,250,0.65)',
  },
});
