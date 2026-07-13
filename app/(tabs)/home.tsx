import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { HomeStatsRow } from '@/components/home/HomeStatsRow';
import { HomeUpcomingCard } from '@/components/home/HomeUpcomingCard';
import { HomeVehicleHero } from '@/components/home/HomeVehicleHero';
import { QuickActionGrid } from '@/components/home/QuickActionGrid';
import {
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '@/components/ui';
import { VEHICLE_TYPE_LABELS } from '@/constants/vehicles';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { useTranslation } from '@/localization';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { brand, radii, spacing, typography } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const {
    activeVehicle,
    vehicles,
    setActiveVehicleId,
    isLoading,
    isError,
    error,
    refetch,
  } = useActiveVehicle();
  const { stats } = useHomeDashboard(activeVehicle);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  if (isLoading) {
    return (
      <AppScreen>
        <LoadingSkeleton lines={6} />
      </AppScreen>
    );
  }

  if (isError) {
    return (
      <AppScreen>
        <ErrorState message={error?.message ?? t('common.error')} onRetry={() => refetch()} />
      </AppScreen>
    );
  }

  if (!activeVehicle || vehicles.length === 0) {
    return (
      <AppScreen scrollable>
        <Text style={[styles.emptyGreeting, { color: colors.textPrimary }]}>
          Hello, Welcome Back!
        </Text>
        <EmptyState
          actionLabel={t('vehicles.add')}
          description={t('home.noVehicleBody')}
          icon="car-sport-outline"
          onAction={() => router.push('/vehicles/create')}
          title={t('home.noVehicleTitle')}
        />
      </AppScreen>
    );
  }

  const typeLabel =
    VEHICLE_TYPE_LABELS[activeVehicle.vehicle_type as keyof typeof VEHICLE_TYPE_LABELS] ??
    activeVehicle.vehicle_type;

  const nextServiceLabel = stats.nextReminder
    ? `${stats.nextReminder.title}${
        stats.nextReminder.dueDate ? ` · due ${stats.nextReminder.dueDate}` : ''
      }`
    : 'No upcoming reminders — tap Reminders to add one';

  const fuelValue =
    stats.fuelEconomyKmPerLitre != null
      ? `${stats.fuelEconomyKmPerLitre.toFixed(1)} km/l`
      : '— km/l';

  return (
    <AppScreen scrollable>
      <HomeVehicleHero
        greeting={`Hello, ${firstName}!`}
        nextServiceLabel={nextServiceLabel}
        onOpenVehicle={() => router.push(`/vehicles/${activeVehicle.id}`)}
        onProfilePress={() => router.push('/settings/profile')}
        onSelectVehicle={setActiveVehicleId}
        vehicle={activeVehicle}
        vehicles={vehicles}
      />

      <QuickActionGrid
        actions={[
          {
            key: 'diagnostics',
            label: 'Scan Fault',
            icon: 'construct-outline',
            onPress: () => router.push('/ai/scan-fault'),
          },
          {
            key: 'reminders',
            label: 'Reminders',
            icon: 'notifications-outline',
            onPress: () => router.push('/reminders'),
          },
          {
            key: 'fuel',
            label: 'Fuel Log',
            icon: 'flame-outline',
            onPress: () => router.push('/fuel/create'),
          },
          {
            key: 'documents',
            label: 'Documents',
            icon: 'document-text-outline',
            onPress: () => router.push('/documents/create'),
          },
        ]}
      />

      {stats.nextReminder ? (
        <HomeUpcomingCard
          badge={stats.pendingReminderCount > 1 ? `${stats.pendingReminderCount}` : undefined}
          subtitle={
            stats.nextReminder.dueDate
              ? `Due ${stats.nextReminder.dueDate}`
              : 'Tap to review your reminders'
          }
          title={stats.nextReminder.title}
          onPress={() => router.push('/reminders')}
        />
      ) : null}

      <HomeStatsRow
        expensesLabel="This month"
        expensesValue={formatMoney(stats.monthExpenseMinor, stats.currency)}
        fuelEconomyLabel="Fuel Efficiency"
        fuelEconomyValue={fuelValue}
      />

      <View style={styles.metaRow}>
        <Pressable
          onPress={() => router.push(`/vehicles/${activeVehicle.id}`)}
          style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Odometer</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
            {activeVehicle.current_odometer.toLocaleString('en-LK')} {activeVehicle.odometer_unit}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/vehicles/${activeVehicle.id}`)}
          style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Type</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{typeLabel}</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/vehicles/create')}
        style={[styles.addVehicle, { borderColor: brand.green }]}
      >
        <Text style={[styles.addVehicleText, { color: brand.green }]}>+ Add another vehicle</Text>
      </Pressable>

      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        {t('home.healthDisclaimer')}
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  emptyGreeting: {
    ...typography.title,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metaCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  metaLabel: {
    ...typography.caption,
  },
  metaValue: {
    ...typography.bodyStrong,
    marginTop: spacing.xs,
  },
  addVehicle: {
    borderWidth: 1.5,
    borderRadius: radii.full,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  addVehicleText: {
    ...typography.bodyStrong,
    fontWeight: '700',
  },
  disclaimer: {
    ...typography.micro,
    marginBottom: spacing.xxl,
  },
});
