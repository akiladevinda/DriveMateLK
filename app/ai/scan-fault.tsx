import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { AnalysisSuggestionsPanel } from '@/components/ai/AnalysisSuggestionsPanel';
import { ScanAnalyzingOverlay } from '@/components/ai/ScanAnalyzingOverlay';
import { AiSafetyBanner } from '@/components/shared/AiSafetyBanner';
import { AppHeader, AppScreen, PrimaryButton } from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { useTranslation } from '@/localization';
import { getAIProvider } from '@/services/ai';
import type { DashboardAnalysis } from '@/services/ai/types';
import { useTheme } from '@/theme';
import { brand, radii, spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { compressDashboardPhoto } from '@/utils/image-compress';

const ANALYZE_STAGES = [
  'Framing dashboard…',
  'Detecting warning lamps…',
  'Matching fault patterns…',
  'Preparing guidance…',
];

export default function ScanFaultScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { activeVehicle, vehicles } = useActiveVehicle();
  const [vehicleId, setVehicleId] = useState(activeVehicle?.id ?? '');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DashboardAnalysis | null>(null);

  useEffect(() => {
    if (activeVehicle?.id) setVehicleId(activeVehicle.id);
  }, [activeVehicle?.id]);

  useEffect(() => {
    if (!loading) {
      setStageIndex(0);
      return;
    }
    const id = setInterval(() => {
      setStageIndex((i) => (i + 1) % ANALYZE_STAGES.length);
    }, 1400);
    return () => clearInterval(id);
  }, [loading]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? activeVehicle ?? vehicles[0] ?? null,
    [vehicles, vehicleId, activeVehicle],
  );

  const pickImage = async (fromCamera: boolean) => {
    if (fromCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Camera permission is required.');
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo library permission is required.');
        return;
      }
    }

    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: false,
        });

    if (!picked.canceled && picked.assets[0]) {
      try {
        const compressed = await compressDashboardPhoto(picked.assets[0].uri);
        setImageUri(compressed.uri);
        setImageBase64(compressed.base64);
        setResult(null);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    }
  };

  const analyze = async () => {
    const selectedId = vehicleId || activeVehicle?.id || vehicles[0]?.id;
    if (!selectedId) {
      setError('Add a vehicle first.');
      return;
    }
    if (!imageBase64) {
      setError('Capture or attach a dashboard photo first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const analysis = await getAIProvider().analyzeDashboardImage({
        vehicleId: selectedId,
        imageBase64,
        mimeType: 'image/jpeg',
        dashboardMessage: message || undefined,
      });
      setResult(analysis);
      if (analysis.modelId === 'mock-drivemate-lk-v1') {
        const reason = analysis.limitations?.[0];
        if (reason) setError(reason);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetScan = () => {
    setImageUri(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    setMessage('');
  };

  return (
    <AppScreen scrollable contentContainerStyle={styles.screenPad}>
      <AppHeader showBack title={t('ai.scanFault')} />

      <Animated.View entering={FadeInDown.duration(450)} style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Scan Fault</Text>
        <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
          Capture a dashboard warning light. We’ll analyse it and suggest what to do next.
        </Text>
      </Animated.View>

      {selectedVehicle ? (
        <Animated.View entering={FadeIn.delay(80)} style={styles.vehicleRow}>
          <View style={[styles.vehiclePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="car-sport-outline" size={16} color={brand.green} />
            <Text style={[styles.vehicleText, { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedVehicle.nickname ?? `${selectedVehicle.make} ${selectedVehicle.model}`}
            </Text>
          </View>
          {vehicles.length > 1 ? (
            <Pressable
              onPress={() => {
                const idx = vehicles.findIndex((v) => v.id === selectedVehicle.id);
                const next = vehicles[(idx + 1) % vehicles.length];
                if (next) setVehicleId(next.id);
              }}
              style={styles.switchBtn}
            >
              <Text style={{ color: brand.green, ...typography.caption, fontWeight: '700' }}>
                Switch
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : (
        <Pressable onPress={() => router.push('/vehicles/create')} style={styles.addVehicle}>
          <Text style={{ color: brand.green, ...typography.bodyStrong }}>Add a vehicle to scan</Text>
        </Pressable>
      )}

      <Animated.View entering={FadeInUp.delay(120).duration(500)}>
        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <LinearGradient
              colors={['transparent', 'rgba(7,17,28,0.75)']}
              style={styles.previewFade}
            />
            <View style={styles.previewActions}>
              <Pressable
                accessibilityLabel="Retake photo"
                onPress={() => void pickImage(true)}
                style={styles.previewChip}
              >
                <Ionicons name="camera" size={16} color={brand.white} />
                <Text style={styles.previewChipText}>Retake</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Choose another image"
                onPress={() => void pickImage(false)}
                style={styles.previewChip}
              >
                <Ionicons name="images" size={16} color={brand.white} />
                <Text style={styles.previewChipText}>Replace</Text>
              </Pressable>
              <Pressable accessibilityLabel="Clear photo" onPress={resetScan} style={styles.previewChip}>
                <Ionicons name="trash-outline" size={16} color={brand.white} />
                <Text style={styles.previewChipText}>Clear</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.captureCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.captureIconWrap}>
              <LinearGradient
                colors={['rgba(46,201,70,0.25)', 'rgba(46,201,70,0.05)']}
                style={styles.captureIconBg}
              >
                <Ionicons name="scan-outline" size={36} color={brand.green} />
              </LinearGradient>
            </View>
            <Text style={[styles.captureTitle, { color: colors.textPrimary }]}>
              Add dashboard photo
            </Text>
            <Text style={[styles.captureHint, { color: colors.textSecondary }]}>
              Centre the warning lamp. Good light helps recognition.
            </Text>
            <View style={styles.captureRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void pickImage(true)}
                style={({ pressed }) => [
                  styles.captureBtnPrimary,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Ionicons name="camera" size={20} color={brand.white} />
                <Text style={styles.captureBtnPrimaryText}>Take photo</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void pickImage(false)}
                style={({ pressed }) => [
                  styles.captureBtnSecondary,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Ionicons name="image-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.captureBtnSecondaryText, { color: colors.textPrimary }]}>
                  Gallery
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>

      <View style={[styles.noteBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.noteLabel, { color: colors.textMuted }]}>Note (optional)</Text>
        <TextInput
          multiline
          numberOfLines={2}
          onChangeText={setMessage}
          placeholder='e.g. “check engine light is on”'
          placeholderTextColor={colors.textMuted}
          style={[styles.noteInput, { color: colors.textPrimary }]}
          value={message}
        />
      </View>

      <PrimaryButton
        disabled={!imageBase64 || loading}
        label={result ? 'Scan again' : 'Analyse fault'}
        loading={loading}
        onPress={() => void analyze()}
        style={styles.analyzeBtn}
      />

      {error ? (
        <Animated.Text entering={FadeIn} style={[styles.error, { color: colors.danger }]}>
          {error}
        </Animated.Text>
      ) : null}

      <View style={styles.safetyWrap}>
        <AiSafetyBanner />
      </View>

      {result ? (
        <Animated.View entering={FadeInUp.duration(500)} style={styles.results}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsTitle, { color: colors.textPrimary }]}>Scan results</Text>
            {result.modelId && result.modelId !== 'mock-drivemate-lk-v1' ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live AI</Text>
              </View>
            ) : (
              <View style={[styles.liveBadge, styles.mockBadge]}>
                <Text style={styles.mockText}>Fallback</Text>
              </View>
            )}
          </View>
          <AiSafetyBanner notice={result.safetyNotice} />
          <AnalysisSuggestionsPanel symbols={result.detectedSymbols} />
          {result.limitations?.length ? (
            <Text style={[styles.limitations, { color: colors.textMuted }]}>
              {result.limitations.join(' ')}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}

      <ScanAnalyzingOverlay
        stageLabel={ANALYZE_STAGES[stageIndex]}
        visible={loading}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenPad: {
    paddingBottom: spacing.huge,
  },
  hero: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  heroBody: {
    ...typography.body,
    maxWidth: 340,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  vehiclePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  vehicleText: {
    ...typography.caption,
    fontWeight: '600',
    flexShrink: 1,
  },
  switchBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  addVehicle: {
    marginBottom: spacing.lg,
  },
  captureCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  captureIconWrap: {
    marginBottom: spacing.sm,
  },
  captureIconBg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureTitle: {
    ...typography.heading,
    textAlign: 'center',
  },
  captureHint: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  captureRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.sm,
  },
  captureBtnPrimary: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.full,
    backgroundColor: brand.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  captureBtnPrimaryText: {
    color: brand.white,
    ...typography.bodyStrong,
  },
  captureBtnSecondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  captureBtnSecondaryText: {
    ...typography.bodyStrong,
  },
  previewWrap: {
    height: 280,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: brand.navy,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  previewFade: {
    ...StyleSheet.absoluteFillObject,
    top: '45%',
  },
  previewActions: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7,17,28,0.7)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  previewChipText: {
    color: brand.white,
    ...typography.caption,
    fontWeight: '600',
  },
  noteBox: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  noteLabel: {
    ...typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  noteInput: {
    ...typography.body,
    minHeight: 48,
    textAlignVertical: 'top',
    padding: 0,
  },
  analyzeBtn: {
    marginBottom: spacing.md,
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  safetyWrap: {
    marginBottom: spacing.md,
  },
  results: {
    marginTop: spacing.md,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46,201,70,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.green,
  },
  liveText: {
    color: brand.green,
    ...typography.micro,
    fontWeight: '700',
  },
  mockBadge: {
    backgroundColor: 'rgba(249,168,38,0.15)',
  },
  mockText: {
    color: brand.orange,
    ...typography.micro,
    fontWeight: '700',
  },
  limitations: {
    ...typography.micro,
    marginBottom: spacing.xxl,
  },
});
