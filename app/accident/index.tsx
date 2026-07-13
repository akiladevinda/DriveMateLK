import { useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import * as Location from 'expo-location';

import {
  AppHeader,
  AppScreen,
  FormInput,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import * as insuranceService from '@/services/insurance-service';
import { exportAccidentPackagePdf } from '@/services/report-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

const SAFETY_CHECKLIST = [
  'Move to a safe location if possible',
  'Check yourself and passengers for injuries',
  'Turn on hazard lights',
  'Place warning triangle if available',
  'Do not admit fault at the scene',
  'Exchange details with other parties',
  'Photograph damage, plates, and road layout',
  'Note witness contact details',
] as const;

export default function AccidentAssistantScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { activeVehicle } = useActiveVehicle();

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [locationText, setLocationText] = useState('');
  const [photoNotes, setPhotoNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleCheck = (label: string) => {
    setChecked((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const callEmergency = () => {
    void Linking.openURL('tel:119');
  };

  const shareLocation = async () => {
    setError(null);
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setError('Location permission denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const text = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
      setLocationText(text);
      await Share.share({ message: `My location: ${text}` });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const saveDraftAndExport = async () => {
    if (!user || !activeVehicle) {
      setError('Select a vehicle from the Vehicles tab first.');
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const description = [
        'Accident assistance draft',
        locationText ? `Location: ${locationText}` : null,
        photoNotes ? `Notes: ${photoNotes}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const claimResult = await insuranceService.createClaim(
        user.id,
        {
          vehicle_id: activeVehicle.id,
          incident_date: format(new Date(), 'yyyy-MM-dd'),
          description,
          currency: 'LKR',
          notes: photoNotes || null,
        },
        { status: 'draft' },
      );

      if (claimResult.error) {
        setError(claimResult.error.message);
        return;
      }

      const pdfResult = await exportAccidentPackagePdf({
        vehicleLabel: `${activeVehicle.make} ${activeVehicle.model}`,
        registrationNumber: activeVehicle.registration_number,
        incidentDate: format(new Date(), 'yyyy-MM-dd'),
        locationText,
        photoNotes,
        claimDraftId: claimResult.data?.id ?? null,
        safetyChecklist: SAFETY_CHECKLIST.map((label) => ({
          label,
          checked: Boolean(checked[label]),
        })),
      });

      if (pdfResult.error) {
        setError(pdfResult.error.message);
        return;
      }

      setStatus('Claim draft saved and PDF package generated.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scrollable>
      <AppHeader
        showBack
        subtitle={activeVehicle?.registration_number}
        title="Accident assistant"
      />
      <Text style={[styles.warning, { color: colors.danger }]}>
        If anyone is injured, call emergency services immediately.
      </Text>

      <PrimaryButton label="Call 119 (Sri Lanka emergency)" onPress={callEmergency} />
      <SecondaryButton label="Share current location" onPress={() => void shareLocation()} style={styles.gap} />

      <Text style={[styles.section, { color: colors.textPrimary }]}>Safety checklist</Text>
      <View style={styles.checklist}>
        {SAFETY_CHECKLIST.map((label) => (
          <Pressable
            key={label}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: Boolean(checked[label]) }}
            onPress={() => toggleCheck(label)}
            style={[styles.checkItem, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.textPrimary }}>
              {checked[label] ? '☑' : '☐'} {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FormInput
        label="Location (coords or address)"
        multiline
        onChangeText={setLocationText}
        value={locationText}
      />
      <FormInput
        label="Photo & scene notes"
        multiline
        onChangeText={setPhotoNotes}
        value={photoNotes}
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {status ? <Text style={[styles.status, { color: colors.success }]}>{status}</Text> : null}

      <PrimaryButton
        label="Save claim draft & export PDF"
        loading={loading}
        onPress={() => void saveDraftAndExport()}
        style={styles.gap}
      />
      <SecondaryButton
        label="Open insurance hub"
        onPress={() => router.push('/insurance')}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  warning: {
    ...typography.bodyStrong,
    marginBottom: spacing.lg,
  },
  section: {
    ...typography.heading,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  checklist: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  checkItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
  },
  gap: {
    marginTop: spacing.md,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.md,
  },
  status: {
    ...typography.caption,
    marginTop: spacing.md,
  },
});
