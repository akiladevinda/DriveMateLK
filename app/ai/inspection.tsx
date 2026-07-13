import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AiSafetyBanner } from '@/components/shared/AiSafetyBanner';
import { AppHeader, AppScreen, PrimaryButton } from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { useTranslation } from '@/localization';
import { getAIProvider } from '@/services/ai';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

export default function AiInspectionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { activeVehicle } = useActiveVehicle();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runInspection = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAIProvider().inspectVehicleImages({
        vehicleId: activeVehicle?.id,
        make: activeVehicle?.make,
        model: activeVehicle?.model,
        year: activeVehicle?.manufacture_year,
        images: [],
        inspectionPurpose: 'owner_check',
      });
      setSummary(result.overallAssessment);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('ai.inspection')} />
      <AiSafetyBanner />
      <PrimaryButton label="Run inspection assistant" loading={loading} onPress={runInspection} />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {summary ? <Text style={{ color: colors.textPrimary, marginTop: spacing.lg }}>{summary}</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.caption,
    marginTop: spacing.md,
  },
});
