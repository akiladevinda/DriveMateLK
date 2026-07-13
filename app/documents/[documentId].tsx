import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { DocumentCard } from '@/components/cards';
import { AppHeader, AppScreen, ErrorState, LoadingSkeleton } from '@/components/ui';
import * as documentService from '@/services/document-service';
import { useAuthStore } from '@/stores/auth-store';

export default function DocumentDetailScreen() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      if (!user || !documentId) throw new Error('Not found');
      const result = await documentService.getDocument(user.id, documentId);
      if (result.error || !result.data) throw new Error(result.error?.message);
      return result.data;
    },
    enabled: Boolean(user && documentId),
  });

  return (
    <AppScreen scrollable>
      <AppHeader showBack title="Document" />
      {isLoading ? <LoadingSkeleton lines={3} /> : null}
      {isError ? <ErrorState message={error?.message ?? 'Error'} onRetry={() => refetch()} /> : null}
      {data ? (
        <DocumentCard
          documentType={data.document_type}
          expiryDateIso={data.expiry_date}
          expiryStatus={data.status}
          provider={data.provider}
          title={data.title}
        />
      ) : null}
    </AppScreen>
  );
}
