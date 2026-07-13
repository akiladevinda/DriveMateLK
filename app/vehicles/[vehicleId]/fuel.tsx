import { useLocalSearchParams, useRouter } from 'expo-router';

import { FeatureStubScreen } from '@/components/shared/FeatureStubScreen';
import { PrimaryButton } from '@/components/ui';

export default function VehicleFuelScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();

  return (
    <FeatureStubScreen
      description={`Vehicle ${vehicleId ?? ''} — fuel entries and efficiency tracking.`}
      title="Fuel"
    >
      <PrimaryButton label="Add fuel entry" onPress={() => router.push('/fuel/create')} />
    </FeatureStubScreen>
  );
}
