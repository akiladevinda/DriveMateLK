import { Redirect } from 'expo-router';

/** Email verification is disabled — keep route for old links. */
export default function VerifyEmailScreen() {
  return <Redirect href="/(auth)/account-created" />;
}
