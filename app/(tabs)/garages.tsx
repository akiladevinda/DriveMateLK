import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { GarageCard } from '@/components/cards';
import {
  AppHeader,
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  SearchBar,
} from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import { isSupabaseConfigured } from '@/lib/env';
import { useTranslation } from '@/localization';
import * as garageService from '@/services/garage-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';

export default function GaragesTabScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');

  const filterKey = search.trim() || 'all';
  const { data: garages = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.garages(filterKey),
    queryFn: async () => {
      const result = await garageService.listGarages(user?.id, search.trim() ? { search: search.trim() } : undefined);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: isSupabaseConfigured(),
  });

  if (!isSupabaseConfigured()) {
    return (
      <AppScreen scrollable>
        <AppHeader title={t('garages.title')} />
        <EmptyState
          description="Add Supabase credentials and run seed data to browse demo garages."
          icon="cloud-offline-outline"
          title="Backend not configured"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader title={t('garages.title')} />
      <Text style={[styles.notice, { color: colors.warning, backgroundColor: colors.warningMuted }]}>
        {t('garages.demoNotice')}
      </Text>

      <SearchBar
        onChangeText={setSearch}
        placeholder="Search by name or district"
        style={styles.search}
        value={search}
      />

      {isLoading ? <LoadingSkeleton lines={3} /> : null}
      {isError ? (
        <ErrorState message={error?.message ?? t('common.error')} onRetry={() => refetch()} />
      ) : null}

      {!isLoading && !isError && garages.length === 0 ? (
        <EmptyState
          description="Garage listings will appear here once seeded in Supabase."
          icon="build-outline"
          title={t('common.empty')}
        />
      ) : null}

      <View style={styles.list}>
        {garages.map((garage) => (
          <GarageCard
            key={garage.id}
            district={garage.district}
            isFavorite={garage.isFavorite}
            name={garage.business_name}
            onPress={() => router.push(`/garages/${garage.id}`)}
            rating={garage.rating ?? undefined}
            reviewCount={garage.review_count}
            serviceCategories={garage.service_categories}
            verified={garage.verification_status === 'verified' || garage.verification_status === 'demo'}
          />
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    ...typography.caption,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  search: {
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
