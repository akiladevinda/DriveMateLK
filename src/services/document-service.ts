import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { DocumentCreateInput, DocumentUpdateInput } from '@/schemas/document';
import type { TablesInsert, TablesUpdate, VehicleDocument } from '@/types/database';

export type DocumentServiceError = {
  message: string;
  code?: string;
};

export type DocumentResult<T> =
  | { data: T; error: null }
  | { data: null; error: DocumentServiceError };

function mapError(error: { message: string; code?: string } | null): DocumentServiceError | null {
  if (!error) {
    return null;
  }
  return { message: error.message, code: error.code ?? 'document_error' };
}

export async function listDocuments(
  userId: string,
  vehicleId: string,
): Promise<DocumentResult<VehicleDocument[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId)
    .order('expiry_date', { ascending: true, nullsFirst: false });

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }

  return { data: data ?? [], error: null };
}

export async function getDocument(
  userId: string,
  documentId: string,
): Promise<DocumentResult<VehicleDocument>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .maybeSingle();

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  if (!data) {
    return { data: null, error: { message: 'Document not found', code: 'not_found' } };
  }

  return { data, error: null };
}

export async function createDocument(
  userId: string,
  input: DocumentCreateInput,
): Promise<DocumentResult<VehicleDocument>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesInsert<'vehicle_documents'> = {
    user_id: userId,
    ...input,
  };

  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert(payload)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to create document', code: 'create_failed' },
    };
  }

  await supabase.from('vehicle_timeline_events').insert({
    user_id: userId,
    vehicle_id: input.vehicle_id,
    event_type: 'document_uploaded',
    title: input.title,
    description: `${input.document_type} document uploaded`,
    occurred_at: new Date().toISOString(),
  });

  return { data, error: null };
}

export async function updateDocument(
  userId: string,
  documentId: string,
  input: DocumentUpdateInput,
): Promise<DocumentResult<VehicleDocument>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesUpdate<'vehicle_documents'> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('vehicle_documents')
    .update(payload)
    .eq('id', documentId)
    .eq('user_id', userId)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to update document', code: 'update_failed' },
    };
  }

  return { data, error: null };
}

export async function deleteDocument(
  userId: string,
  documentId: string,
): Promise<DocumentResult<null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { error } = await supabase
    .from('vehicle_documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId);

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }

  return { data: null, error: null };
}
