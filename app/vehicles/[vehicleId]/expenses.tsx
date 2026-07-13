import { useLocalSearchParams, useRouter } from 'expo-router';

import { FeatureStubScreen } from '@/components/shared/FeatureStubScreen';
import { PrimaryButton } from '@/components/ui';

export default function VehicleExpensesScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();

  return (
    <FeatureStubScreen
      description={`Vehicle ${vehicleId ?? ''} — ownership costs and receipts.`}
      title="Expenses"
    >
      <PrimaryButton label="Add expense" onPress={() => router.push('/expenses/create')} />
    </FeatureStubScreen>
  );
}
