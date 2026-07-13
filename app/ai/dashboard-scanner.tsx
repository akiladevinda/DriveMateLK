import { Redirect } from 'expo-router';

/** @deprecated Use `/ai/scan-fault` — kept for existing deep links. */
export default function DashboardScannerRedirect() {
  return <Redirect href="/ai/scan-fault" />;
}
