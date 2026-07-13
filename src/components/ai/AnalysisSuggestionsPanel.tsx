import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ExpandableSection } from '@/components/ai/ExpandableSection';
import { NearbyGarageSuggestionCard } from '@/components/ai/NearbyGarageSuggestionCard';
import { SecondaryButton } from '@/components/ui';
import { useCurrentLocation } from '@/hooks/use-current-location';
import type { DetectedDashboardSymbol } from '@/services/ai/types';
import {
  fetchNearbyGarageSuggestions,
  type NearbyGarageSuggestion,
} from '@/services/nearby-garages-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';

type Props = {
  symbols: DetectedDashboardSymbol[];
};

export function AnalysisSuggestionsPanel({ symbols }: Props) {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const location = useCurrentLocation(true);
  const [garages, setGarages] = useState<NearbyGarageSuggestion[]>([]);
  const [garageSource, setGarageSource] = useState<'google_places' | 'drivemate' | null>(null);
  const [garageLoading, setGarageLoading] = useState(false);
  const [garageError, setGarageError] = useState<string | null>(null);

  const symbolKey = useMemo(() => symbols.map((s) => s.name).join('|'), [symbols]);
  const symbolNames = useMemo(() => symbols.map((s) => s.name), [symbols]);

  const { coords, refresh, error: locationError, loading: locationLoading, permissionDenied } =
    location;

  const loadGarages = useCallback(async () => {
    const nextCoords = coords ?? (await refresh());
    if (!nextCoords) {
      setGarageError('Location unavailable.');
      return;
    }

    setGarageLoading(true);
    setGarageError(null);
    try {
      const result = await fetchNearbyGarageSuggestions({
        latitude: nextCoords.latitude,
        longitude: nextCoords.longitude,
        userId: user?.id,
        symbolNames,
      });
      setGarages(result.data);
      setGarageSource(result.source);
      if (result.notice) {
        setGarageError(result.notice);
      } else if (!result.data.length) {
        setGarageError('No nearby workshops found. Try again or check the Garages tab.');
      }
    } catch (err) {
      setGarageError(err instanceof Error ? err.message : 'Could not load workshops.');
    } finally {
      setGarageLoading(false);
    }
  }, [coords, refresh, symbolNames, user?.id]);

  useEffect(() => {
    if (!coords) return;
    void loadGarages();
  }, [coords?.latitude, coords?.longitude, symbolKey, loadGarages]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>What we found</Text>
      <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
        Tap each item to expand causes, fixes, and nearby workshops.
      </Text>

      {symbols.map((symbol, index) => (
        <ExpandableSection
          key={symbol.name}
          title={symbol.name}
          subtitle={symbol.likelyMeaning || symbol.description}
          badge={symbol.severity}
          defaultExpanded={index === 0}
        >
          <Text style={[styles.body, { color: colors.textSecondary }]}>{symbol.description}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Confidence {Math.round(symbol.confidence * 100)}%
            {symbol.canContinueDriving
              ? ` · Driving: ${String(symbol.canContinueDriving).replace(/_/g, ' ')}`
              : ''}
          </Text>

          {symbol.possibleCauses?.length ? (
            <View style={styles.list}>
              <Text style={[styles.listTitle, { color: colors.textPrimary }]}>Possible causes</Text>
              {symbol.possibleCauses.map((cause) => (
                <Text key={cause} style={[styles.listItem, { color: colors.textSecondary }]}>
                  • {cause}
                </Text>
              ))}
            </View>
          ) : null}

          {symbol.recommendedActions?.length ? (
            <View style={styles.list}>
              <Text style={[styles.listTitle, { color: colors.textPrimary }]}>Suggested fixes</Text>
              {symbol.recommendedActions.map((action) => (
                <Text key={action} style={[styles.listItem, { color: colors.textSecondary }]}>
                  • {action}
                </Text>
              ))}
            </View>
          ) : null}
        </ExpandableSection>
      ))}

      <ExpandableSection
        title="Nearby workshops"
        subtitle={
          garageSource === 'google_places'
            ? 'Ranked by Google rating near you'
            : 'Ranked by rating near your location'
        }
        badge={garages.length ? `${garages.length}` : undefined}
        defaultExpanded
      >
        {locationLoading || garageLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.textMuted} />
            <Text style={[styles.meta, { color: colors.textMuted }]}>Finding workshops near you…</Text>
          </View>
        ) : null}

        {permissionDenied || locationError ? (
          <View style={styles.list}>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {locationError ?? 'Allow location access to list nearby garages.'}
            </Text>
            <SecondaryButton label="Enable location" onPress={() => void loadGarages()} />
          </View>
        ) : null}

        {!garageLoading && garageError ? (
          <Text style={[styles.body, { color: colors.textSecondary }]}>{garageError}</Text>
        ) : null}

        {garages.map((garage) => (
          <NearbyGarageSuggestionCard key={garage.id} garage={garage} />
        ))}

        {garages.length ? (
          <SecondaryButton label="Refresh nearby list" onPress={() => void loadGarages()} />
        ) : null}
      </ExpandableSection>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
  },
  meta: {
    ...typography.caption,
  },
  list: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  listTitle: {
    ...typography.bodyStrong,
  },
  listItem: {
    ...typography.caption,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
