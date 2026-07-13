import { useLocalSearchParams } from 'expo-router';

import { FeatureStubScreen } from '@/components/shared/FeatureStubScreen';
import { useTranslation } from '@/localization';

export default function VehicleTimelineScreen() {
  const { t } = useTranslation();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();

  return (
    <FeatureStubScreen
      description={`Vehicle ${vehicleId ?? ''} — chronological ownership events.`}
      title={t('vehicles.timeline')}
    />
  );
}
