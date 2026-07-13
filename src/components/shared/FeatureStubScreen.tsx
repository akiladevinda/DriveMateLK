import type { ReactNode } from 'react';

import { AppHeader, AppScreen, EmptyState } from '@/components/ui';

type FeatureStubScreenProps = {
  title: string;
  description?: string;
  showBack?: boolean;
  children?: ReactNode;
};

export function FeatureStubScreen({
  title,
  description = 'This feature is coming soon. You can navigate back and explore other areas of the app.',
  showBack = true,
  children,
}: FeatureStubScreenProps) {
  return (
    <AppScreen scrollable>
      <AppHeader showBack={showBack} title={title} />
      {children ?? (
        <EmptyState
          description={description}
          icon="construct-outline"
          title={`${title} — coming soon`}
        />
      )}
    </AppScreen>
  );
}
