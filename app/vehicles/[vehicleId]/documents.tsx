import { useLocalSearchParams } from 'expo-router';

import { FeatureStubScreen } from '@/components/shared/FeatureStubScreen';
import { useTranslation } from '@/localization';

export default function VehicleDocumentsScreen() {
  const { t } = useTranslation();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();

  return (
    <FeatureStubScreen
      description={`Vehicle ${vehicleId ?? ''} — upload and track insurance, revenue licence and other documents.`}
      title={t('vehicles.documents')}
    />
  );
}
