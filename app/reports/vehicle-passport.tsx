import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  AppScreen,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { isSupabaseConfigured } from '@/lib/env';
import { exportVehiclePassportPdf } from '@/services/report-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

const SECTIONS = [
  { key: 'profile' as const, label: 'Vehicle profile' },
  { key: 'documents' as const, label: 'Documents' },
  { key: 'services' as const, label: 'Service history' },
  { key: 'expenses' as const, label: 'Expenses' },
  { key: 'health' as const, label: 'Health score' },
];

export default function VehiclePassportScreen() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { activeVehicle } = useActiveVehicle();
  const [selected, setSelected] = useState<string[]>(SECTIONS.map((s) => s.key));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const exportPdf = async () => {
    if (!user || !activeVehicle) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const result = await exportVehiclePassportPdf(
        user.id,
        activeVehicle.id,
        selected as Array<'profile' | 'documents' | 'services' | 'expenses' | 'health'>,
      );
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setStatus('PDF generated and share sheet opened.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Vehicle passport" />
        <EmptyState
          description="Configure Supabase to compile passport data from your vehicle records."
          icon="cloud-offline-outline"
          title="Backend not configured"
        />
      </AppScreen>
    );
  }

  if (!activeVehicle) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Vehicle passport" />
        <EmptyState description="Add a vehicle to generate a digital passport." icon="car-outline" title="No vehicle" />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack title="Vehicle passport" />
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Export a PDF summary of {activeVehicle.make} {activeVehicle.model} ({activeVehicle.registration_number}).
        Informational only — not a certified inspection.
      </Text>

      <View style={styles.sections}>
        {SECTIONS.map((section) => {
          const active = selected.includes(section.key);
          return (
            <SecondaryButton
              key={section.key}
              label={active ? `✓ ${section.label}` : section.label}
              onPress={() => toggleSection(section.key)}
            />
          );
        })}
      </View>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {status ? <Text style={[styles.status, { color: colors.success }]}>{status}</Text> : null}

      <PrimaryButton
        disabled={selected.length === 0}
        label="Export PDF"
        loading={loading}
        onPress={exportPdf}
        style={styles.export}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  sections: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  status: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  export: {
    marginBottom: spacing.xxxl,
  },
});
