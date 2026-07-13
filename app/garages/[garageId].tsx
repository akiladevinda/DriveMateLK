import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GarageCard } from '@/components/cards';
import {
  AppHeader,
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import { isSupabaseConfigured } from '@/lib/env';
import { useTranslation } from '@/localization';
import * as garageService from '@/services/garage-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { radii, spacing, typography } from '@/theme/tokens';

export default function GarageDetailScreen() {
  const { garageId } = useLocalSearchParams<{ garageId: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: garage, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.garage(garageId ?? ''),
    queryFn: async () => {
      const result = await garageService.getGarage(garageId!, user?.id);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(garageId) && isSupabaseConfigured(),
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !garageId) throw new Error('Not signed in');
      const result = await garageService.toggleFavorite(user.id, garageId);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.garage(garageId ?? '') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.garages() });
    },
  });

  if (!isSupabaseConfigured()) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Garage detail" />
        <EmptyState
          description="Configure Supabase to load garage listings."
          icon="cloud-offline-outline"
          title="Backend not configured"
        />
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Garage detail" />
        <LoadingSkeleton lines={5} />
      </AppScreen>
    );
  }

  if (isError || !garage) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Garage detail" />
        <ErrorState message={error?.message ?? t('common.error')} onRetry={() => refetch()} />
      </AppScreen>
    );
  }

  const verified = garage.verification_status === 'verified' || garage.verification_status === 'demo';

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={garage.business_name} />
      <GarageCard
        district={garage.district}
        isFavorite={garage.isFavorite}
        name={garage.business_name}
        onFavoritePress={user ? () => favoriteMutation.mutate() : undefined}
        rating={garage.rating ?? undefined}
        reviewCount={garage.review_count}
        serviceCategories={garage.service_categories}
        verified={verified}
      />

      {garage.description ? (
        <Text style={[styles.body, { color: colors.textSecondary }]}>{garage.description}</Text>
      ) : null}

      <View style={[styles.infoBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <InfoRow colors={colors} icon="location-outline" label="Address" value={garage.address} />
        {garage.phone ? <InfoRow colors={colors} icon="call-outline" label="Phone" value={garage.phone} /> : null}
        {garage.email ? <InfoRow colors={colors} icon="mail-outline" label="Email" value={garage.email} /> : null}
        {garage.price_range ? (
          <InfoRow colors={colors} icon="pricetag-outline" label="Price range" value={garage.price_range} />
        ) : null}
      </View>

      <View style={styles.badges}>
        {garage.emergency_support ? <Badge colors={colors} label="Emergency support" /> : null}
        {garage.mobile_service ? <Badge colors={colors} label="Mobile service" /> : null}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={t('garages.requestQuote')}
          onPress={() => router.push(`/garages/request-quote?garageId=${garage.id}`)}
        />
        <SecondaryButton
          label={t('garages.book')}
          onPress={() => router.push(`/garages/booking?garageId=${garage.id}`)}
        />
      </View>
    </AppScreen>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: { textPrimary: string; textMuted: string };
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons color={colors.textMuted} name={icon} size={18} />
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

function Badge({ label, colors }: { label: string; colors: { accentMuted: string; accent: string } }) {
  return (
    <View style={[styles.badge, { backgroundColor: colors.accentMuted }]}>
      <Text style={[styles.badgeText, { color: colors.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    marginTop: spacing.lg,
  },
  infoBlock: {
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    gap: spacing.xxs,
  },
  infoLabel: {
    ...typography.micro,
  },
  infoValue: {
    ...typography.body,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  badgeText: {
    ...typography.micro,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
});
