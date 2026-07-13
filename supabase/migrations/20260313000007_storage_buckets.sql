-- DriveMate LK: storage buckets and object policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('vehicle-images', 'vehicle-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('vehicle-documents', 'vehicle-documents', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('service-attachments', 'service-attachments', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('expense-receipts', 'expense-receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('dashboard-scans', 'dashboard-scans', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('inspection-media', 'inspection-media', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('garage-images', 'garage-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('insurance-claims', 'insurance-claims', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('generated-reports', 'generated-reports', false, 52428800, array['application/pdf', 'application/json'])
on conflict (id) do nothing;

-- Helper: object path must start with auth.uid()
create or replace function public.storage_object_owned_by_user(object_name text)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
    and split_part(object_name, '/', 1) = auth.uid()::text;
$$;

-- Generic authenticated user folder policies per bucket
do $$
declare
  bucket_name text;
begin
  foreach bucket_name in array array[
    'avatars',
    'vehicle-images',
    'vehicle-documents',
    'service-attachments',
    'expense-receipts',
    'dashboard-scans',
    'inspection-media',
    'garage-images',
    'insurance-claims',
    'generated-reports'
  ]
  loop
    execute format(
      'create policy %I on storage.objects for select to authenticated using (bucket_id = %L and public.storage_object_owned_by_user(name));',
      bucket_name || '_select_own',
      bucket_name
    );
    execute format(
      'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and public.storage_object_owned_by_user(name));',
      bucket_name || '_insert_own',
      bucket_name
    );
    execute format(
      'create policy %I on storage.objects for update to authenticated using (bucket_id = %L and public.storage_object_owned_by_user(name)) with check (bucket_id = %L and public.storage_object_owned_by_user(name));',
      bucket_name || '_update_own',
      bucket_name,
      bucket_name
    );
    execute format(
      'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and public.storage_object_owned_by_user(name));',
      bucket_name || '_delete_own',
      bucket_name
    );
  end loop;
end $$;
