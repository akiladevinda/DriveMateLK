import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AiSafetyBanner } from '@/components/shared/AiSafetyBanner';
import { AppHeader, AppScreen, FormInput, PrimaryButton } from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { useTranslation } from '@/localization';
import { getAIProvider } from '@/services/ai';
import type { SymptomAnalysis } from '@/services/ai/types';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

export default function SymptomAssistantScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { activeVehicle } = useActiveVehicle();
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SymptomAnalysis | null>(null);

  const analyze = async () => {
    if (!activeVehicle) {
      setError('Add a vehicle first.');
      return;
    }
    if (!symptoms.trim()) {
      setError('Describe your symptoms.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const analysis = await getAIProvider().analyzeVehicleSymptoms({
        vehicleId: activeVehicle.id,
        symptoms,
        odometer: activeVehicle.current_odometer,
      });
      setResult(analysis);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('ai.symptomAssistant')} />
      <AiSafetyBanner />
      <FormInput
        label="Describe symptoms"
        multiline
        numberOfLines={5}
        onChangeText={setSymptoms}
        placeholder="e.g. rattling noise when braking, worse in rain"
        value={symptoms}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PrimaryButton label="Get guidance" loading={loading} onPress={analyze} />

      {result ? (
        <ScrollView style={styles.results}>
          <AiSafetyBanner notice={result.safetyNotice} />
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            {result.symptomSummary}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Risk level: {result.riskLevel}
          </Text>
          {result.possibleCauses.map((cause) => (
            <View key={cause.cause} style={styles.cause}>
              <Text style={[styles.causeTitle, { color: colors.textPrimary }]}>
                {cause.cause}
              </Text>
              <Text style={{ color: colors.textSecondary }}>{cause.explanation}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.caption,
    marginVertical: spacing.md,
  },
  results: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxxl,
    gap: spacing.md,
  },
  heading: {
    ...typography.heading,
    marginVertical: spacing.md,
  },
  cause: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  causeTitle: {
    ...typography.bodyStrong,
  },
});
