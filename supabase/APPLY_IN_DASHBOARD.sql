-- DriveMate LK: apply all migrations (run in Supabase SQL Editor)
-- Project: ckmnbagdfqqydoyebrqf


-- ============================================================
-- FILE: 20260313000001_init_extensions_and_helpers.sql
-- ============================================================
-- DriveMate LK: extensions and auth helpers

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

do $$
begin
  create extension if not exists "moddatetime" with schema extensions;
exception
  when others then
    raise notice 'moddatetime extension not available: %', sqlerrm;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, v_full_name)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = timezone('utc', now());

  return new;
end;
$$;

-- Trigger attached after profiles table is created (migration 20260313000002).


-- ============================================================
-- FILE: 20260313000002_profiles_and_settings.sql
-- ============================================================
-- DriveMate LK: profiles, settings, notifications, emergency contacts, push tokens

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'si', 'ta')),
  preferred_currency text not null default 'LKR',
  profile_photo_url text,
  home_district text,
  emergency_contact_name text,
  emergency_contact_phone text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index profiles_email_idx on public.profiles (email);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  theme_mode text not null default 'system'
    check (theme_mode in ('light', 'dark', 'system')),
  language text not null default 'en'
    check (language in ('en', 'si', 'ta')),
  currency_code text not null default 'LKR',
  notifications_enabled boolean not null default true,
  biometric_enabled boolean not null default false,
  email_notifications boolean not null default true,
  push_notifications boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index user_settings_user_id_idx on public.user_settings (user_id);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "Users manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  document_expiry_enabled boolean not null default true,
  maintenance_due_enabled boolean not null default true,
  fuel_reminders_enabled boolean not null default false,
  garage_updates_enabled boolean not null default true,
  roadside_updates_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index notification_preferences_user_id_idx on public.notification_preferences (user_id);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "Users manage own notification preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index emergency_contacts_user_id_idx on public.emergency_contacts (user_id);

create trigger emergency_contacts_set_updated_at
  before update on public.emergency_contacts
  for each row execute function public.set_updated_at();

alter table public.emergency_contacts enable row level security;

create policy "Users manage own emergency contacts"
  on public.emergency_contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_name text,
  app_version text,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, token)
);

create index device_push_tokens_user_id_idx on public.device_push_tokens (user_id);

create trigger device_push_tokens_set_updated_at
  before update on public.device_push_tokens
  for each row execute function public.set_updated_at();

alter table public.device_push_tokens enable row level security;

create policy "Users manage own push tokens"
  on public.device_push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Minimal entitlements row for signup bootstrap (expanded in migration 6)
create table public.subscription_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  max_vehicles integer not null default 2,
  max_ai_scans_per_month integer not null default 10,
  max_document_storage_mb integer not null default 500,
  family_sharing_enabled boolean not null default false,
  advanced_reports_enabled boolean not null default false,
  valid_from timestamptz not null default timezone('utc', now()),
  valid_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.subscription_entitlements enable row level security;

create policy "Users view own subscription"
  on public.subscription_entitlements for select
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, v_full_name)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = timezone('utc', now());

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.subscription_entitlements (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- FILE: 20260313000003_vehicles.sql
-- ============================================================
-- DriveMate LK: vehicles and related ownership / health tables

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text,
  registration_number text not null,
  make text not null,
  model text not null,
  variant text,
  manufacture_year integer not null check (manufacture_year >= 1950),
  registration_year integer check (registration_year >= 1950),
  vehicle_type text not null default 'car'
    check (vehicle_type in (
      'car', 'suv', 'van', 'motorcycle', 'scooter', 'three_wheeler',
      'truck', 'ev', 'hybrid', 'other'
    )),
  fuel_type text not null default 'petrol'
    check (fuel_type in (
      'petrol', 'diesel', 'hybrid_petrol', 'hybrid_diesel',
      'electric', 'cng', 'other'
    )),
  transmission text not null default 'manual'
    check (transmission in ('manual', 'automatic', 'cvt', 'dct', 'other')),
  engine_capacity_cc integer check (engine_capacity_cc > 0),
  vin text,
  chassis_number text,
  engine_number text,
  color text,
  current_odometer numeric(12, 1) not null default 0 check (current_odometer >= 0),
  odometer_unit text not null default 'km' check (odometer_unit in ('km', 'mi')),
  purchase_date date,
  purchase_price_minor integer check (purchase_price_minor >= 0),
  purchase_currency text not null default 'LKR',
  ownership_type text not null default 'owned'
    check (ownership_type in ('owned', 'leased', 'financed', 'company')),
  financing_status text not null default 'none'
    check (financing_status in ('none', 'active', 'settled')),
  previous_owners_count integer check (previous_owners_count >= 0),
  notes text,
  main_image_url text,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index vehicles_user_id_idx on public.vehicles (user_id);
create index vehicles_registration_number_idx on public.vehicles (registration_number);
create unique index vehicles_user_registration_uidx
  on public.vehicles (user_id, registration_number);

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

alter table public.vehicles enable row level security;

-- ---------------------------------------------------------------------------
-- vehicle_photos
-- ---------------------------------------------------------------------------
create table public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index vehicle_photos_vehicle_id_idx on public.vehicle_photos (vehicle_id);

create trigger vehicle_photos_set_updated_at
  before update on public.vehicle_photos
  for each row execute function public.set_updated_at();

alter table public.vehicle_photos enable row level security;

-- ---------------------------------------------------------------------------
-- vehicle_members
-- ---------------------------------------------------------------------------
create table public.vehicle_members (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('owner', 'manager', 'driver', 'viewer', 'emergency_only')),
  permissions jsonb not null default '{}'::jsonb,
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (vehicle_id, user_id)
);

create index vehicle_members_vehicle_id_idx on public.vehicle_members (vehicle_id);
create index vehicle_members_user_id_idx on public.vehicle_members (user_id);

create trigger vehicle_members_set_updated_at
  before update on public.vehicle_members
  for each row execute function public.set_updated_at();

alter table public.vehicle_members enable row level security;

-- ---------------------------------------------------------------------------
-- Vehicle access helpers (after vehicle_members exists)
-- ---------------------------------------------------------------------------
create or replace function public.user_can_access_vehicle(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.vehicle_members vm
    where vm.vehicle_id = p_vehicle_id
      and vm.user_id = auth.uid()
      and vm.accepted_at is not null
  );
$$;

create or replace function public.user_can_manage_vehicle(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.vehicle_members vm
    where vm.vehicle_id = p_vehicle_id
      and vm.user_id = auth.uid()
      and vm.accepted_at is not null
      and vm.role in ('owner', 'manager')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies that depend on access helpers
-- ---------------------------------------------------------------------------
create policy "Users view accessible vehicles"
  on public.vehicles for select
  using (public.user_can_access_vehicle(id));

create policy "Users insert own vehicles"
  on public.vehicles for insert
  with check (auth.uid() = user_id);

create policy "Managers update accessible vehicles"
  on public.vehicles for update
  using (public.user_can_manage_vehicle(id))
  with check (public.user_can_manage_vehicle(id));

create policy "Owners delete own vehicles"
  on public.vehicles for delete
  using (auth.uid() = user_id);

create policy "Vehicle photo access"
  on public.vehicle_photos for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

create policy "Members view vehicle membership"
  on public.vehicle_members for select
  using (public.user_can_access_vehicle(vehicle_id) or auth.uid() = user_id);

create policy "Managers manage vehicle members"
  on public.vehicle_members for all
  using (public.user_can_manage_vehicle(vehicle_id))
  with check (public.user_can_manage_vehicle(vehicle_id));

create policy "Invitees accept membership"
  on public.vehicle_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- vehicle_invitations
-- ---------------------------------------------------------------------------
create table public.vehicle_invitations (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  invited_by uuid not null references auth.users (id) on delete cascade,
  invitee_email text not null,
  role text not null default 'viewer'
    check (role in ('owner', 'manager', 'driver', 'viewer', 'emergency_only')),
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index vehicle_invitations_vehicle_id_idx on public.vehicle_invitations (vehicle_id);
create index vehicle_invitations_invitee_email_idx on public.vehicle_invitations (invitee_email);

create trigger vehicle_invitations_set_updated_at
  before update on public.vehicle_invitations
  for each row execute function public.set_updated_at();

alter table public.vehicle_invitations enable row level security;

create policy "Managers manage invitations"
  on public.vehicle_invitations for all
  using (public.user_can_manage_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = invited_by
  );

-- ---------------------------------------------------------------------------
-- vehicle_ownership_records
-- ---------------------------------------------------------------------------
create table public.vehicle_ownership_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ownership_type text not null
    check (ownership_type in ('owned', 'leased', 'financed', 'company')),
  started_on date not null,
  ended_on date,
  purchase_price_minor integer check (purchase_price_minor >= 0),
  purchase_currency text default 'LKR',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index vehicle_ownership_records_vehicle_id_idx
  on public.vehicle_ownership_records (vehicle_id);

create trigger vehicle_ownership_records_set_updated_at
  before update on public.vehicle_ownership_records
  for each row execute function public.set_updated_at();

alter table public.vehicle_ownership_records enable row level security;

create policy "Ownership record access"
  on public.vehicle_ownership_records for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- vehicle_odometer_entries
-- ---------------------------------------------------------------------------
create table public.vehicle_odometer_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reading numeric(12, 1) not null check (reading >= 0),
  unit text not null default 'km' check (unit in ('km', 'mi')),
  recorded_at timestamptz not null default timezone('utc', now()),
  source text not null default 'manual'
    check (source in ('manual', 'fuel_entry', 'service', 'import', 'other')),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index vehicle_odometer_entries_vehicle_id_idx
  on public.vehicle_odometer_entries (vehicle_id, recorded_at desc);

alter table public.vehicle_odometer_entries enable row level security;

create policy "Odometer entry access"
  on public.vehicle_odometer_entries for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- vehicle_health_scores
-- ---------------------------------------------------------------------------
create table public.vehicle_health_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  total_score numeric(5, 2) not null check (total_score >= 0 and total_score <= 100),
  status_label text not null,
  factor_breakdown jsonb not null default '{}'::jsonb,
  recommended_actions text[] not null default '{}',
  disclaimer text not null,
  calculated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index vehicle_health_scores_vehicle_id_idx
  on public.vehicle_health_scores (vehicle_id, calculated_at desc);

create trigger vehicle_health_scores_set_updated_at
  before update on public.vehicle_health_scores
  for each row execute function public.set_updated_at();

alter table public.vehicle_health_scores enable row level security;

create policy "Health score access"
  on public.vehicle_health_scores for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- vehicle_health_factors
-- ---------------------------------------------------------------------------
create table public.vehicle_health_factors (
  id uuid primary key default gen_random_uuid(),
  health_score_id uuid not null references public.vehicle_health_scores (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  factor_key text not null,
  factor_label text not null,
  score numeric(5, 2) not null,
  weight numeric(5, 2) not null default 1,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index vehicle_health_factors_score_id_idx
  on public.vehicle_health_factors (health_score_id);

alter table public.vehicle_health_factors enable row level security;

create policy "Health factor access"
  on public.vehicle_health_factors for select
  using (public.user_can_access_vehicle(vehicle_id));

-- ---------------------------------------------------------------------------
-- vehicle_timeline_events
-- ---------------------------------------------------------------------------
create table public.vehicle_timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  event_type text not null
    check (event_type in (
      'vehicle_added', 'document_uploaded', 'fuel_entry', 'expense_added',
      'service_completed', 'maintenance_due', 'warning_light_detected',
      'issue_reported', 'issue_resolved', 'insurance_renewed', 'licence_renewed',
      'valuation_generated', 'report_shared', 'odometer_updated', 'other'
    )),
  title text not null,
  description text,
  metadata jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index vehicle_timeline_events_vehicle_id_idx
  on public.vehicle_timeline_events (vehicle_id, occurred_at desc);

alter table public.vehicle_timeline_events enable row level security;

create policy "Timeline event access"
  on public.vehicle_timeline_events for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- Auto-add owner membership on vehicle insert
create or replace function public.handle_new_vehicle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vehicle_members (vehicle_id, user_id, role, accepted_at)
  values (new.id, new.user_id, 'owner', timezone('utc', now()))
  on conflict (vehicle_id, user_id) do nothing;

  insert into public.vehicle_timeline_events (
    user_id, vehicle_id, event_type, title, description, occurred_at
  ) values (
    new.user_id,
    new.id,
    'vehicle_added',
    'Vehicle added',
    coalesce(new.nickname, new.registration_number),
    timezone('utc', now())
  );

  return new;
end;
$$;

create trigger on_vehicle_created
  after insert on public.vehicles
  for each row execute function public.handle_new_vehicle();

grant execute on function public.user_can_access_vehicle(uuid) to authenticated;
grant execute on function public.user_can_manage_vehicle(uuid) to authenticated;


-- ============================================================
-- FILE: 20260313000004_documents_maintenance_fuel_expenses.sql
-- ============================================================
-- DriveMate LK: documents, maintenance, fuel, expenses, trips

-- ---------------------------------------------------------------------------
-- vehicle_documents
-- ---------------------------------------------------------------------------
create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  document_type text not null
    check (document_type in (
      'registration_certificate', 'insurance_certificate', 'revenue_licence',
      'emission_certificate', 'lease_agreement', 'service_invoice',
      'repair_receipt', 'warranty', 'tire_warranty', 'battery_warranty',
      'driving_licence', 'other'
    )),
  title text not null,
  provider text,
  reference_number text,
  issue_date date,
  expiry_date date,
  amount_minor integer check (amount_minor >= 0),
  currency text not null default 'LKR',
  owner_name text,
  storage_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  status text not null default 'pending_confirmation'
    check (status in ('valid', 'expiring_soon', 'expired', 'no_expiry', 'pending_confirmation')),
  extraction_confirmed boolean not null default false,
  extracted_data jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index vehicle_documents_vehicle_id_idx on public.vehicle_documents (vehicle_id);
create index vehicle_documents_expiry_date_idx on public.vehicle_documents (expiry_date);

create trigger vehicle_documents_set_updated_at
  before update on public.vehicle_documents
  for each row execute function public.set_updated_at();

alter table public.vehicle_documents enable row level security;

create policy "Document access"
  on public.vehicle_documents for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- document_extractions
-- ---------------------------------------------------------------------------
create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.vehicle_documents (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  model_id text,
  raw_response jsonb not null default '{}'::jsonb,
  extracted_fields jsonb not null default '{}'::jsonb,
  confidence numeric(5, 4) check (confidence >= 0 and confidence <= 1),
  confirmed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index document_extractions_document_id_idx on public.document_extractions (document_id);

alter table public.document_extractions enable row level security;

create policy "Document extraction access"
  on public.document_extractions for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- document_reminders
-- ---------------------------------------------------------------------------
create table public.document_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  document_id uuid references public.vehicle_documents (id) on delete set null,
  reminder_type text not null
    check (reminder_type in (
      'insurance', 'revenue_licence', 'emission_test', 'service', 'engine_oil',
      'filters', 'tires', 'brake_inspection', 'battery', 'lease_payment',
      'warranty', 'custom'
    )),
  title text not null,
  due_date date,
  due_odometer numeric(12, 1),
  notify_days_before integer[] not null default '{30,14,7,1}',
  status text not null default 'pending'
    check (status in ('pending', 'snoozed', 'completed', 'dismissed', 'overdue')),
  snoozed_until timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index document_reminders_vehicle_id_idx on public.document_reminders (vehicle_id);
create index document_reminders_due_date_idx on public.document_reminders (due_date);

create trigger document_reminders_set_updated_at
  before update on public.document_reminders
  for each row execute function public.set_updated_at();

alter table public.document_reminders enable row level security;

create policy "Document reminder access"
  on public.document_reminders for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- document_shares
-- ---------------------------------------------------------------------------
create table public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.vehicle_documents (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index document_shares_document_id_idx on public.document_shares (document_id);

create trigger document_shares_set_updated_at
  before update on public.document_shares
  for each row execute function public.set_updated_at();

alter table public.document_shares enable row level security;

create policy "Document share access"
  on public.document_shares for all
  using (public.user_can_manage_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- maintenance_templates (seedable global catalog)
-- ---------------------------------------------------------------------------
create table public.maintenance_templates (
  id uuid primary key default gen_random_uuid(),
  maintenance_type text not null unique,
  title text not null,
  description text,
  default_interval_months integer,
  default_interval_km integer,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger maintenance_templates_set_updated_at
  before update on public.maintenance_templates
  for each row execute function public.set_updated_at();

alter table public.maintenance_templates enable row level security;

create policy "Anyone can read maintenance templates"
  on public.maintenance_templates for select
  using (is_active = true);

-- ---------------------------------------------------------------------------
-- vehicle_maintenance_schedules
-- ---------------------------------------------------------------------------
create table public.vehicle_maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  template_id uuid references public.maintenance_templates (id) on delete set null,
  maintenance_type text not null,
  due_date date,
  due_odometer numeric(12, 1),
  repeat_interval_months integer,
  repeat_interval_km integer,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'pending'
    check (status in ('pending', 'due_soon', 'overdue', 'completed')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index vehicle_maintenance_schedules_vehicle_id_idx
  on public.vehicle_maintenance_schedules (vehicle_id);

create trigger vehicle_maintenance_schedules_set_updated_at
  before update on public.vehicle_maintenance_schedules
  for each row execute function public.set_updated_at();

alter table public.vehicle_maintenance_schedules enable row level security;

create policy "Maintenance schedule access"
  on public.vehicle_maintenance_schedules for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- maintenance_reminders
-- ---------------------------------------------------------------------------
create table public.maintenance_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  schedule_id uuid references public.vehicle_maintenance_schedules (id) on delete set null,
  reminder_type text not null
    check (reminder_type in (
      'insurance', 'revenue_licence', 'emission_test', 'service', 'engine_oil',
      'filters', 'tires', 'brake_inspection', 'battery', 'lease_payment',
      'warranty', 'custom'
    )),
  title text not null,
  due_date date,
  due_odometer numeric(12, 1),
  status text not null default 'pending'
    check (status in ('pending', 'snoozed', 'completed', 'dismissed', 'overdue')),
  snoozed_until timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index maintenance_reminders_vehicle_id_idx on public.maintenance_reminders (vehicle_id);

create trigger maintenance_reminders_set_updated_at
  before update on public.maintenance_reminders
  for each row execute function public.set_updated_at();

alter table public.maintenance_reminders enable row level security;

create policy "Maintenance reminder access"
  on public.maintenance_reminders for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- service_records
-- ---------------------------------------------------------------------------
create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  service_date date not null,
  odometer numeric(12, 1) not null,
  garage_id uuid,
  garage_name text,
  service_type text not null,
  labour_cost_minor integer not null default 0 check (labour_cost_minor >= 0),
  parts_cost_minor integer not null default 0 check (parts_cost_minor >= 0),
  other_cost_minor integer not null default 0 check (other_cost_minor >= 0),
  total_cost_minor integer not null default 0 check (total_cost_minor >= 0),
  currency text not null default 'LKR',
  invoice_storage_path text,
  notes text,
  warranty_until date,
  next_service_date date,
  next_service_odometer numeric(12, 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index service_records_vehicle_id_idx on public.service_records (vehicle_id, service_date desc);

create trigger service_records_set_updated_at
  before update on public.service_records
  for each row execute function public.set_updated_at();

alter table public.service_records enable row level security;

create policy "Service record access"
  on public.service_records for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- service_items
-- ---------------------------------------------------------------------------
create table public.service_items (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records (id) on delete cascade,
  work_performed text not null,
  part_name text,
  part_brand text,
  part_number text,
  quantity numeric(10, 2) not null default 1,
  unit_cost_minor integer not null default 0 check (unit_cost_minor >= 0),
  warranty_expiry date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index service_items_service_record_id_idx on public.service_items (service_record_id);

create trigger service_items_set_updated_at
  before update on public.service_items
  for each row execute function public.set_updated_at();

alter table public.service_items enable row level security;

create policy "Service item access"
  on public.service_items for all
  using (
    exists (
      select 1 from public.service_records sr
      where sr.id = service_record_id
        and public.user_can_access_vehicle(sr.vehicle_id)
    )
  )
  with check (
    exists (
      select 1 from public.service_records sr
      where sr.id = service_record_id
        and public.user_can_manage_vehicle(sr.vehicle_id)
    )
  );

-- ---------------------------------------------------------------------------
-- service_attachments
-- ---------------------------------------------------------------------------
create table public.service_attachments (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null default 0,
  caption text,
  created_at timestamptz not null default timezone('utc', now())
);

create index service_attachments_service_record_id_idx
  on public.service_attachments (service_record_id);

alter table public.service_attachments enable row level security;

create policy "Service attachment access"
  on public.service_attachments for all
  using (
    exists (
      select 1 from public.service_records sr
      where sr.id = service_record_id
        and public.user_can_access_vehicle(sr.vehicle_id)
    )
  )
  with check (
    exists (
      select 1 from public.service_records sr
      where sr.id = service_record_id
        and public.user_can_manage_vehicle(sr.vehicle_id)
    )
  );

-- ---------------------------------------------------------------------------
-- vehicle_parts
-- ---------------------------------------------------------------------------
create table public.vehicle_parts (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  part_name text not null,
  part_brand text,
  part_number text,
  installed_at date,
  installed_odometer numeric(12, 1),
  warranty_expiry date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index vehicle_parts_vehicle_id_idx on public.vehicle_parts (vehicle_id);

create trigger vehicle_parts_set_updated_at
  before update on public.vehicle_parts
  for each row execute function public.set_updated_at();

alter table public.vehicle_parts enable row level security;

create policy "Vehicle parts access"
  on public.vehicle_parts for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- expense_categories (seedable)
-- ---------------------------------------------------------------------------
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.expense_categories enable row level security;

create policy "Anyone can read expense categories"
  on public.expense_categories for select
  using (is_active = true);

-- ---------------------------------------------------------------------------
-- fuel_entries
-- ---------------------------------------------------------------------------
create table public.fuel_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  entry_date date not null,
  odometer numeric(12, 1) not null,
  litres numeric(10, 3) not null check (litres > 0),
  total_amount_minor integer not null check (total_amount_minor >= 0),
  price_per_litre_minor integer check (price_per_litre_minor >= 0),
  currency text not null default 'LKR',
  fuel_type text not null default 'petrol'
    check (fuel_type in (
      'petrol', 'diesel', 'hybrid_petrol', 'hybrid_diesel',
      'electric', 'cng', 'other'
    )),
  fuel_station text,
  is_full_tank boolean not null default true,
  receipt_storage_path text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index fuel_entries_vehicle_id_idx on public.fuel_entries (vehicle_id, entry_date desc);

create trigger fuel_entries_set_updated_at
  before update on public.fuel_entries
  for each row execute function public.set_updated_at();

alter table public.fuel_entries enable row level security;

create policy "Fuel entry access"
  on public.fuel_entries for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  category text not null
    check (category in (
      'fuel', 'service', 'repair', 'insurance', 'revenue_licence', 'emission_test',
      'tires', 'battery', 'parking', 'highway_toll', 'cleaning', 'accessories',
      'modification', 'leasing', 'inspection', 'roadside_assistance', 'other'
    )),
  title text not null,
  expense_date date not null,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'LKR',
  odometer numeric(12, 1),
  vendor text,
  receipt_storage_path text,
  notes text,
  linked_service_id uuid references public.service_records (id) on delete set null,
  linked_fuel_entry_id uuid references public.fuel_entries (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index expenses_vehicle_id_idx on public.expenses (vehicle_id, expense_date desc);
create index expenses_category_idx on public.expenses (category);

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

create policy "Expense access"
  on public.expenses for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- expense_attachments
-- ---------------------------------------------------------------------------
create table public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index expense_attachments_expense_id_idx on public.expense_attachments (expense_id);

alter table public.expense_attachments enable row level security;

create policy "Expense attachment access"
  on public.expense_attachments for all
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
        and public.user_can_access_vehicle(e.vehicle_id)
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
        and public.user_can_manage_vehicle(e.vehicle_id)
    )
  );

-- ---------------------------------------------------------------------------
-- trip_records
-- ---------------------------------------------------------------------------
create table public.trip_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  start_odometer numeric(12, 1),
  end_odometer numeric(12, 1),
  distance_km numeric(10, 2),
  purpose text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index trip_records_vehicle_id_idx on public.trip_records (vehicle_id, started_at desc);

create trigger trip_records_set_updated_at
  before update on public.trip_records
  for each row execute function public.set_updated_at();

alter table public.trip_records enable row level security;

create policy "Trip record access"
  on public.trip_records for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );


-- ============================================================
-- FILE: 20260313000005_ai_garages_roadside.sql
-- ============================================================
-- DriveMate LK: AI, garages, roadside assistance

-- ---------------------------------------------------------------------------
-- ai_conversations
-- ---------------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  conversation_type text not null default 'general'
    check (conversation_type in ('general', 'dashboard_scan', 'symptom', 'inspection', 'resale')),
  title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index ai_conversations_user_id_idx on public.ai_conversations (user_id, updated_at desc);

create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

alter table public.ai_conversations enable row level security;

create policy "Users manage own AI conversations"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ai_messages
-- ---------------------------------------------------------------------------
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index ai_messages_conversation_id_idx on public.ai_messages (conversation_id, created_at);

alter table public.ai_messages enable row level security;

create policy "Users manage own AI messages"
  on public.ai_messages for all
  using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- ai_usage_events (rate limiting / billing)
-- ---------------------------------------------------------------------------
create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  function_name text not null,
  model_id text,
  tokens_in integer,
  tokens_out integer,
  latency_ms integer,
  success boolean not null default true,
  error_code text,
  created_at timestamptz not null default timezone('utc', now())
);

create index ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

alter table public.ai_usage_events enable row level security;

create policy "Users view own AI usage"
  on public.ai_usage_events for select
  using (auth.uid() = user_id);

create policy "Service role inserts AI usage"
  on public.ai_usage_events for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- dashboard_scans
-- ---------------------------------------------------------------------------
create table public.dashboard_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  image_storage_path text not null,
  dashboard_message text,
  analysis_result jsonb not null default '{}'::jsonb,
  ai_model text,
  issue_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index dashboard_scans_vehicle_id_idx on public.dashboard_scans (vehicle_id, created_at desc);

create trigger dashboard_scans_set_updated_at
  before update on public.dashboard_scans
  for each row execute function public.set_updated_at();

alter table public.dashboard_scans enable row level security;

create policy "Dashboard scan access"
  on public.dashboard_scans for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- symptom_reports
-- ---------------------------------------------------------------------------
create table public.symptom_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  symptoms text not null,
  odometer numeric(12, 1),
  obd_codes text[],
  warning_light_visible boolean,
  analysis_result jsonb not null default '{}'::jsonb,
  ai_model text,
  issue_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index symptom_reports_vehicle_id_idx on public.symptom_reports (vehicle_id, created_at desc);

create trigger symptom_reports_set_updated_at
  before update on public.symptom_reports
  for each row execute function public.set_updated_at();

alter table public.symptom_reports enable row level security;

create policy "Symptom report access"
  on public.symptom_reports for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- vehicle_issues
-- ---------------------------------------------------------------------------
create table public.vehicle_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  title text not null,
  description text,
  severity text not null default 'attention'
    check (severity in ('informational', 'attention', 'urgent', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'monitoring', 'resolved', 'dismissed')),
  source text not null default 'manual'
    check (source in ('dashboard_scan', 'symptom_analysis', 'manual', 'inspection', 'obd')),
  dashboard_scan_id uuid references public.dashboard_scans (id) on delete set null,
  ai_analysis jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index vehicle_issues_vehicle_id_idx on public.vehicle_issues (vehicle_id, created_at desc);

alter table public.vehicle_issues enable row level security;

create policy "Vehicle issue access"
  on public.vehicle_issues for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

alter table public.dashboard_scans
  add constraint dashboard_scans_issue_id_fkey
  foreign key (issue_id) references public.vehicle_issues (id) on delete set null;

alter table public.symptom_reports
  add constraint symptom_reports_issue_id_fkey
  foreign key (issue_id) references public.vehicle_issues (id) on delete set null;

-- ---------------------------------------------------------------------------
-- inspection_reports & findings
-- ---------------------------------------------------------------------------
create table public.inspection_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  inspection_purpose text not null
    check (inspection_purpose in ('pre_purchase', 'owner_check', 'resale_prep')),
  completion_percentage numeric(5, 2) not null default 0,
  overall_assessment text,
  analysis_result jsonb not null default '{}'::jsonb,
  ai_model text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index inspection_reports_vehicle_id_idx on public.inspection_reports (vehicle_id);

create trigger inspection_reports_set_updated_at
  before update on public.inspection_reports
  for each row execute function public.set_updated_at();

alter table public.inspection_reports enable row level security;

create policy "Inspection report access"
  on public.inspection_reports for all
  using (
    vehicle_id is null
    or public.user_can_access_vehicle(vehicle_id)
  )
  with check (
    auth.uid() = user_id
    and (vehicle_id is null or public.user_can_manage_vehicle(vehicle_id))
  );

create table public.inspection_findings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.inspection_reports (id) on delete cascade,
  category text not null,
  item text not null,
  severity text not null default 'unknown'
    check (severity in ('good', 'attention', 'critical', 'unknown')),
  observation text not null,
  recommended_action text,
  confidence numeric(5, 4),
  created_at timestamptz not null default timezone('utc', now())
);

create index inspection_findings_report_id_idx on public.inspection_findings (report_id);

alter table public.inspection_findings enable row level security;

create policy "Inspection finding access"
  on public.inspection_findings for select
  using (
    exists (
      select 1 from public.inspection_reports r
      where r.id = report_id
        and (
          r.vehicle_id is null
          or public.user_can_access_vehicle(r.vehicle_id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- garages (marketplace)
-- ---------------------------------------------------------------------------
create table public.garages (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete set null,
  business_name text not null,
  description text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'demo')),
  phone text,
  email text,
  website text,
  supported_vehicle_types text[] not null default '{}',
  supported_makes text[] not null default '{}',
  service_categories text[] not null default '{}',
  opening_hours jsonb,
  rating numeric(3, 2),
  review_count integer not null default 0,
  emergency_support boolean not null default false,
  mobile_service boolean not null default false,
  insurance_affiliations text[] not null default '{}',
  price_range text check (price_range in ('budget', 'mid', 'premium')),
  is_demo boolean not null default false,
  is_published boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index garages_district_lookup_idx on public.garages (is_active, is_published, is_demo);

create trigger garages_set_updated_at
  before update on public.garages
  for each row execute function public.set_updated_at();

alter table public.garages enable row level security;

create policy "Public read published or demo garages"
  on public.garages for select
  using (
    (is_published = true or is_demo = true)
    and is_active = true
  );

create policy "Garage owners manage own garage"
  on public.garages for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- ---------------------------------------------------------------------------
-- garage_locations
-- ---------------------------------------------------------------------------
create table public.garage_locations (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  address text not null,
  district text not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index garage_locations_garage_id_idx on public.garage_locations (garage_id);
create index garage_locations_district_idx on public.garage_locations (district);

alter table public.garage_locations enable row level security;

create policy "Public read garage locations"
  on public.garage_locations for select
  using (
    exists (
      select 1 from public.garages g
      where g.id = garage_id
        and (g.is_published = true or g.is_demo = true)
        and g.is_active = true
    )
  );

create policy "Garage owners manage locations"
  on public.garage_locations for all
  using (
    exists (
      select 1 from public.garages g
      where g.id = garage_id and g.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.garages g
      where g.id = garage_id and g.owner_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- garage_services, brands, hours, photos, reviews, favorites
-- ---------------------------------------------------------------------------
create table public.garage_services (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  service_category text not null,
  description text,
  price_from_minor integer check (price_from_minor >= 0),
  currency text default 'LKR',
  created_at timestamptz not null default timezone('utc', now())
);

create index garage_services_garage_id_idx on public.garage_services (garage_id);

alter table public.garage_services enable row level security;

create policy "Public read garage services"
  on public.garage_services for select
  using (
    exists (
      select 1 from public.garages g
      where g.id = garage_id
        and (g.is_published = true or g.is_demo = true)
        and g.is_active = true
    )
  );

create table public.garage_supported_brands (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  make text not null,
  unique (garage_id, make)
);

alter table public.garage_supported_brands enable row level security;

create policy "Public read garage brands"
  on public.garage_supported_brands for select
  using (
    exists (
      select 1 from public.garages g
      where g.id = garage_id
        and (g.is_published = true or g.is_demo = true)
        and g.is_active = true
    )
  );

create table public.garage_opening_hours (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  unique (garage_id, day_of_week)
);

alter table public.garage_opening_hours enable row level security;

create policy "Public read garage hours"
  on public.garage_opening_hours for select
  using (
    exists (
      select 1 from public.garages g
      where g.id = garage_id
        and (g.is_published = true or g.is_demo = true)
        and g.is_active = true
    )
  );

create table public.garage_photos (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.garage_photos enable row level security;

create policy "Public read garage photos"
  on public.garage_photos for select
  using (
    exists (
      select 1 from public.garages g
      where g.id = garage_id
        and (g.is_published = true or g.is_demo = true)
        and g.is_active = true
    )
  );

create table public.garage_reviews (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (garage_id, user_id)
);

create trigger garage_reviews_set_updated_at
  before update on public.garage_reviews
  for each row execute function public.set_updated_at();

alter table public.garage_reviews enable row level security;

create policy "Public read garage reviews"
  on public.garage_reviews for select
  using (true);

create policy "Users manage own reviews"
  on public.garage_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users update own reviews"
  on public.garage_reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.garage_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  garage_id uuid not null references public.garages (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, garage_id)
);

alter table public.garage_favorites enable row level security;

create policy "Users manage own garage favorites"
  on public.garage_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Link service_records.garage_id now that garages exists
alter table public.service_records
  add constraint service_records_garage_id_fkey
  foreign key (garage_id) references public.garages (id) on delete set null;

-- ---------------------------------------------------------------------------
-- service requests, quotes, bookings
-- ---------------------------------------------------------------------------
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  service_category text not null,
  problem_description text not null,
  preferred_date date,
  preferred_district text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'quoted', 'accepted', 'cancelled', 'expired')),
  ai_report_id uuid references public.inspection_reports (id) on delete set null,
  issue_id uuid references public.vehicle_issues (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index service_requests_vehicle_id_idx on public.service_requests (vehicle_id);

create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

alter table public.service_requests enable row level security;

create policy "Service request access"
  on public.service_requests for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

create table public.service_request_attachments (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.service_request_attachments enable row level security;

create policy "Service request attachment access"
  on public.service_request_attachments for all
  using (
    exists (
      select 1 from public.service_requests sr
      where sr.id = service_request_id
        and public.user_can_access_vehicle(sr.vehicle_id)
    )
  )
  with check (
    exists (
      select 1 from public.service_requests sr
      where sr.id = service_request_id
        and public.user_can_manage_vehicle(sr.vehicle_id)
    )
  );

create table public.garage_quotes (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests (id) on delete cascade,
  garage_id uuid not null references public.garages (id) on delete cascade,
  inspection_fee_minor integer check (inspection_fee_minor >= 0),
  labour_estimate_min_minor integer not null default 0,
  labour_estimate_max_minor integer not null default 0,
  parts_estimate_min_minor integer not null default 0,
  parts_estimate_max_minor integer not null default 0,
  total_estimate_min_minor integer not null default 0,
  total_estimate_max_minor integer not null default 0,
  currency text not null default 'LKR',
  earliest_appointment date,
  warranty_days integer,
  notes text,
  valid_until date,
  terms text,
  is_estimate boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index garage_quotes_request_id_idx on public.garage_quotes (service_request_id);

create trigger garage_quotes_set_updated_at
  before update on public.garage_quotes
  for each row execute function public.set_updated_at();

alter table public.garage_quotes enable row level security;

create policy "Quote access via service request owner"
  on public.garage_quotes for select
  using (
    exists (
      select 1 from public.service_requests sr
      where sr.id = service_request_id
        and sr.user_id = auth.uid()
    )
  );

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.garage_quotes (id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_cost_minor integer not null default 0,
  item_type text not null default 'labour'
    check (item_type in ('labour', 'parts', 'other')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.quote_items enable row level security;

create policy "Quote item access"
  on public.quote_items for select
  using (
    exists (
      select 1
      from public.garage_quotes q
      join public.service_requests sr on sr.id = q.service_request_id
      where q.id = quote_id and sr.user_id = auth.uid()
    )
  );

create table public.garage_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  garage_id uuid not null references public.garages (id) on delete restrict,
  service_request_id uuid references public.service_requests (id) on delete set null,
  quote_id uuid references public.garage_quotes (id) on delete set null,
  status text not null default 'requested'
    check (status in (
      'requested', 'quote_received', 'confirmed', 'vehicle_received',
      'inspection_in_progress', 'awaiting_approval', 'repair_in_progress',
      'ready_for_collection', 'completed', 'cancelled'
    )),
  scheduled_at timestamptz,
  notes text,
  invoice_storage_path text,
  service_record_id uuid references public.service_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index garage_bookings_vehicle_id_idx on public.garage_bookings (vehicle_id);

create trigger garage_bookings_set_updated_at
  before update on public.garage_bookings
  for each row execute function public.set_updated_at();

alter table public.garage_bookings enable row level security;

create policy "Garage booking access"
  on public.garage_bookings for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

create table public.booking_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.garage_bookings (id) on delete cascade,
  status text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.booking_status_events enable row level security;

create policy "Booking status event access"
  on public.booking_status_events for select
  using (
    exists (
      select 1 from public.garage_bookings b
      where b.id = booking_id
        and public.user_can_access_vehicle(b.vehicle_id)
    )
  );

create table public.garage_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.garage_bookings (id) on delete cascade,
  sender_user_id uuid references auth.users (id) on delete set null,
  message text not null,
  is_from_garage boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.garage_messages enable row level security;

create policy "Garage message access"
  on public.garage_messages for select
  using (
    exists (
      select 1 from public.garage_bookings b
      where b.id = booking_id
        and public.user_can_access_vehicle(b.vehicle_id)
    )
  );

create policy "Users send garage messages"
  on public.garage_messages for insert
  with check (
    auth.uid() = sender_user_id
    and exists (
      select 1 from public.garage_bookings b
      where b.id = booking_id
        and public.user_can_manage_vehicle(b.vehicle_id)
    )
  );

-- ---------------------------------------------------------------------------
-- roadside providers & requests
-- ---------------------------------------------------------------------------
create table public.roadside_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  phone text not null,
  email text,
  website text,
  district text not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  service_types text[] not null default '{}',
  is_verified boolean not null default false,
  is_demo boolean not null default false,
  rating numeric(3, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index roadside_providers_district_idx on public.roadside_providers (district);

create trigger roadside_providers_set_updated_at
  before update on public.roadside_providers
  for each row execute function public.set_updated_at();

alter table public.roadside_providers enable row level security;

create policy "Public read roadside providers"
  on public.roadside_providers for select
  using (is_verified = true or is_demo = true);

create table public.roadside_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.roadside_providers (id) on delete cascade,
  service_type text not null
    check (service_type in (
      'towing', 'flat_tire', 'battery_jump', 'fuel_delivery', 'lockout',
      'mechanical_breakdown', 'accident', 'other'
    )),
  description text,
  base_fee_minor integer check (base_fee_minor >= 0),
  currency text default 'LKR',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.roadside_services enable row level security;

create policy "Public read roadside services"
  on public.roadside_services for select
  using (
    exists (
      select 1 from public.roadside_providers p
      where p.id = provider_id
        and (p.is_verified = true or p.is_demo = true)
    )
  );

create table public.roadside_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  provider_id uuid references public.roadside_providers (id) on delete set null,
  request_type text not null
    check (request_type in (
      'towing', 'flat_tire', 'battery_jump', 'fuel_delivery', 'lockout',
      'mechanical_breakdown', 'accident', 'other'
    )),
  status text not null default 'requested'
    check (status in (
      'requested', 'assigned', 'on_the_way', 'arrived',
      'in_progress', 'completed', 'cancelled'
    )),
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  address text,
  notes text,
  assigned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index roadside_requests_vehicle_id_idx on public.roadside_requests (vehicle_id);

create trigger roadside_requests_set_updated_at
  before update on public.roadside_requests
  for each row execute function public.set_updated_at();

alter table public.roadside_requests enable row level security;

create policy "Roadside request access"
  on public.roadside_requests for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

create table public.roadside_request_status_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.roadside_requests (id) on delete cascade,
  status text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.roadside_request_status_events enable row level security;

create policy "Roadside status event access"
  on public.roadside_request_status_events for select
  using (
    exists (
      select 1 from public.roadside_requests r
      where r.id = request_id
        and public.user_can_access_vehicle(r.vehicle_id)
    )
  );


-- ============================================================
-- FILE: 20260313000006_insurance_leasing_resale_subscriptions.sql
-- ============================================================
-- DriveMate LK: insurance, leasing, inspections, valuations, subscriptions

-- ---------------------------------------------------------------------------
-- insurance_policies
-- ---------------------------------------------------------------------------
create table public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  insurer_name text not null,
  policy_number text not null,
  coverage_type text,
  premium_minor integer check (premium_minor >= 0),
  currency text not null default 'LKR',
  start_date date not null,
  expiry_date date not null,
  contact_phone text,
  contact_email text,
  document_id uuid references public.vehicle_documents (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index insurance_policies_vehicle_id_idx on public.insurance_policies (vehicle_id);
create index insurance_policies_expiry_idx on public.insurance_policies (expiry_date);

create trigger insurance_policies_set_updated_at
  before update on public.insurance_policies
  for each row execute function public.set_updated_at();

alter table public.insurance_policies enable row level security;

create policy "Insurance policy access"
  on public.insurance_policies for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- insurance_claims
-- ---------------------------------------------------------------------------
create table public.insurance_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  policy_id uuid references public.insurance_policies (id) on delete set null,
  claim_number text,
  incident_date date not null,
  description text not null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid', 'closed')),
  claimed_amount_minor integer check (claimed_amount_minor >= 0),
  approved_amount_minor integer check (approved_amount_minor >= 0),
  currency text not null default 'LKR',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index insurance_claims_vehicle_id_idx on public.insurance_claims (vehicle_id);

create trigger insurance_claims_set_updated_at
  before update on public.insurance_claims
  for each row execute function public.set_updated_at();

alter table public.insurance_claims enable row level security;

create policy "Insurance claim access"
  on public.insurance_claims for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

create table public.insurance_claim_attachments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.insurance_claims (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null default 0,
  caption text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.insurance_claim_attachments enable row level security;

create policy "Insurance claim attachment access"
  on public.insurance_claim_attachments for all
  using (
    exists (
      select 1 from public.insurance_claims c
      where c.id = claim_id
        and public.user_can_access_vehicle(c.vehicle_id)
    )
  )
  with check (
    exists (
      select 1 from public.insurance_claims c
      where c.id = claim_id
        and public.user_can_manage_vehicle(c.vehicle_id)
    )
  );

-- ---------------------------------------------------------------------------
-- lease_records & payments
-- ---------------------------------------------------------------------------
create table public.lease_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  provider_name text not null,
  original_price_minor integer not null check (original_price_minor >= 0),
  down_payment_minor integer not null default 0 check (down_payment_minor >= 0),
  financed_amount_minor integer not null check (financed_amount_minor >= 0),
  currency text not null default 'LKR',
  start_date date not null,
  term_months integer not null check (term_months > 0),
  monthly_payment_minor integer not null check (monthly_payment_minor >= 0),
  interest_rate_percent numeric(6, 3),
  remaining_instalments integer check (remaining_instalments >= 0),
  official_settlement_minor integer check (official_settlement_minor >= 0),
  estimated_remaining_minor integer check (estimated_remaining_minor >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index lease_records_vehicle_id_idx on public.lease_records (vehicle_id);

create trigger lease_records_set_updated_at
  before update on public.lease_records
  for each row execute function public.set_updated_at();

alter table public.lease_records enable row level security;

create policy "Lease record access"
  on public.lease_records for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

create table public.lease_payments (
  id uuid primary key default gen_random_uuid(),
  lease_record_id uuid not null references public.lease_records (id) on delete cascade,
  due_date date not null,
  paid_date date,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'LKR',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'overdue', 'waived')),
  reference_number text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger lease_payments_set_updated_at
  before update on public.lease_payments
  for each row execute function public.set_updated_at();

alter table public.lease_payments enable row level security;

create policy "Lease payment access"
  on public.lease_payments for all
  using (
    exists (
      select 1 from public.lease_records lr
      where lr.id = lease_record_id
        and public.user_can_access_vehicle(lr.vehicle_id)
    )
  )
  with check (
    exists (
      select 1 from public.lease_records lr
      where lr.id = lease_record_id
        and public.user_can_manage_vehicle(lr.vehicle_id)
    )
  );

-- ---------------------------------------------------------------------------
-- inspection checklists
-- ---------------------------------------------------------------------------
create table public.inspection_checklists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  inspection_purpose text not null
    check (inspection_purpose in ('pre_purchase', 'owner_check', 'resale_prep')),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger inspection_checklists_set_updated_at
  before update on public.inspection_checklists
  for each row execute function public.set_updated_at();

alter table public.inspection_checklists enable row level security;

create policy "Anyone can read active checklists"
  on public.inspection_checklists for select
  using (is_active = true);

create table public.inspection_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.inspection_checklists (id) on delete cascade,
  category text not null,
  item text not null,
  sort_order integer not null default 0,
  guidance text,
  created_at timestamptz not null default timezone('utc', now())
);

create index inspection_checklist_items_checklist_id_idx
  on public.inspection_checklist_items (checklist_id, sort_order);

alter table public.inspection_checklist_items enable row level security;

create policy "Anyone can read checklist items"
  on public.inspection_checklist_items for select
  using (
    exists (
      select 1 from public.inspection_checklists c
      where c.id = checklist_id and c.is_active = true
    )
  );

create table public.vehicle_inspections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  checklist_id uuid references public.inspection_checklists (id) on delete set null,
  inspection_date date not null default current_date,
  inspector_name text,
  overall_notes text,
  completion_percentage numeric(5, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger vehicle_inspections_set_updated_at
  before update on public.vehicle_inspections
  for each row execute function public.set_updated_at();

alter table public.vehicle_inspections enable row level security;

create policy "Vehicle inspection access"
  on public.vehicle_inspections for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

create table public.vehicle_inspection_responses (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.vehicle_inspections (id) on delete cascade,
  checklist_item_id uuid references public.inspection_checklist_items (id) on delete set null,
  category text not null,
  item text not null,
  severity text not null default 'unknown'
    check (severity in ('good', 'attention', 'critical', 'unknown')),
  observation text,
  recommended_action text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.vehicle_inspection_responses enable row level security;

create policy "Inspection response access"
  on public.vehicle_inspection_responses for all
  using (
    exists (
      select 1 from public.vehicle_inspections vi
      where vi.id = inspection_id
        and public.user_can_access_vehicle(vi.vehicle_id)
    )
  )
  with check (
    exists (
      select 1 from public.vehicle_inspections vi
      where vi.id = inspection_id
        and public.user_can_manage_vehicle(vi.vehicle_id)
    )
  );

create table public.inspection_media (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.vehicle_inspections (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  caption text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.inspection_media enable row level security;

create policy "Inspection media access"
  on public.inspection_media for all
  using (
    exists (
      select 1 from public.vehicle_inspections vi
      where vi.id = inspection_id
        and public.user_can_access_vehicle(vi.vehicle_id)
    )
  )
  with check (
    exists (
      select 1 from public.vehicle_inspections vi
      where vi.id = inspection_id
        and public.user_can_manage_vehicle(vi.vehicle_id)
    )
  );

-- ---------------------------------------------------------------------------
-- valuations & resale reports
-- ---------------------------------------------------------------------------
create table public.vehicle_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  private_sale_min_minor integer not null check (private_sale_min_minor >= 0),
  private_sale_max_minor integer not null check (private_sale_max_minor >= 0),
  dealer_min_minor integer not null check (dealer_min_minor >= 0),
  dealer_max_minor integer not null check (dealer_max_minor >= 0),
  currency text not null default 'LKR',
  confidence text not null default 'medium'
    check (confidence in ('low', 'medium', 'high')),
  positive_factors text[] not null default '{}',
  negative_factors text[] not null default '{}',
  preparation_recommendations text[] not null default '{}',
  limitations text[] not null default '{}',
  input_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index vehicle_valuations_vehicle_id_idx
  on public.vehicle_valuations (vehicle_id, created_at desc);

alter table public.vehicle_valuations enable row level security;

create policy "Vehicle valuation access"
  on public.vehicle_valuations for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

create table public.market_comparables (
  id uuid primary key default gen_random_uuid(),
  valuation_id uuid not null references public.vehicle_valuations (id) on delete cascade,
  source text,
  listing_price_minor integer not null check (listing_price_minor >= 0),
  mileage numeric(12, 1),
  manufacture_year integer,
  currency text not null default 'LKR',
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.market_comparables enable row level security;

create policy "Market comparable access"
  on public.market_comparables for select
  using (
    exists (
      select 1 from public.vehicle_valuations v
      where v.id = valuation_id
        and public.user_can_access_vehicle(v.vehicle_id)
    )
  );

create table public.resale_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  valuation_id uuid references public.vehicle_valuations (id) on delete set null,
  report_data jsonb not null default '{}'::jsonb,
  storage_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger resale_reports_set_updated_at
  before update on public.resale_reports
  for each row execute function public.set_updated_at();

alter table public.resale_reports enable row level security;

create policy "Resale report access"
  on public.resale_reports for all
  using (public.user_can_access_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

create table public.vehicle_report_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  token_hash text not null,
  included_sections text[] not null default '{}',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger vehicle_report_shares_set_updated_at
  before update on public.vehicle_report_shares
  for each row execute function public.set_updated_at();

alter table public.vehicle_report_shares enable row level security;

create policy "Report share access"
  on public.vehicle_report_shares for all
  using (public.user_can_manage_vehicle(vehicle_id))
  with check (
    public.user_can_manage_vehicle(vehicle_id)
    and auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- subscriptions (expand existing table from migration 2)
-- ---------------------------------------------------------------------------
alter table public.subscription_entitlements
  add constraint subscription_entitlements_plan_check
  check (plan in ('free', 'premium_individual', 'premium_family'));

alter table public.subscription_entitlements
  add constraint subscription_entitlements_status_check
  check (status in ('active', 'trialing', 'past_due', 'cancelled', 'expired'));

create trigger subscription_entitlements_set_updated_at
  before update on public.subscription_entitlements
  for each row execute function public.set_updated_at();

create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement_id uuid references public.subscription_entitlements (id) on delete set null,
  event_type text not null
    check (event_type in (
      'created', 'upgraded', 'downgraded', 'renewed', 'cancelled',
      'expired', 'payment_failed', 'restored'
    )),
  plan text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index subscription_events_user_id_idx on public.subscription_events (user_id, created_at desc);

alter table public.subscription_events enable row level security;

create policy "Users view own subscription events"
  on public.subscription_events for select
  using (auth.uid() = user_id);

create table public.partner_offers (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  title text not null,
  description text,
  offer_code text,
  discount_summary text,
  valid_from date not null default current_date,
  valid_until date,
  target_plans text[] not null default '{free,premium_individual,premium_family}',
  is_active boolean not null default true,
  is_demo boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger partner_offers_set_updated_at
  before update on public.partner_offers
  for each row execute function public.set_updated_at();

alter table public.partner_offers enable row level security;

create policy "Authenticated users read active partner offers"
  on public.partner_offers for select
  using (is_active = true);


-- ============================================================
-- FILE: 20260313000007_storage_buckets.sql
-- ============================================================
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


-- ============================================================
-- FILE: 20260313000008_rls_verification_notes.sql
-- ============================================================
-- DriveMate LK: RLS verification notes (documentation only — no schema changes)
--
-- Purpose: manual checklist for validating row-level security with two test users.
--
-- Setup
-- -----
-- 1. Start local stack: `supabase start`
-- 2. Apply migrations: `supabase db reset` (runs migrations + seed.sql)
-- 3. Create two auth users via Studio or:
--      curl -X POST 'http://127.0.0.1:54321/auth/v1/signup' \
--        -H 'apikey: <anon_key>' -H 'Content-Type: application/json' \
--        -d '{"email":"user-a@test.lk","password":"TestPass123!"}'
--      curl -X POST 'http://127.0.0.1:54321/auth/v1/signup' \
--        -H 'apikey: <anon_key>' -H 'Content-Type: application/json' \
--        -d '{"email":"user-b@test.lk","password":"TestPass123!"}'
-- 4. Sign in each user and capture JWT access tokens (user_a_token, user_b_token).
--
-- Vehicle isolation
-- -----------------
-- As User A (Authorization: Bearer user_a_token):
--   insert into vehicles (user_id, registration_number, make, model, manufacture_year)
--   values ('<user_a_uuid>', 'ABC-1234', 'Toyota', 'Axio', 2018);
--   select * from vehicles;  -- expect 1 row
-- As User B:
--   select * from vehicles;  -- expect 0 rows (not a member)
--   update vehicles set nickname = 'Hacked' where registration_number = 'ABC-1234';
--   -- expect 0 rows updated
--
-- Vehicle membership
-- ------------------
-- As User A, invite User B as viewer via vehicle_members or vehicle_invitations.
-- After User B accepts (accepted_at set):
--   User B select on vehicles / fuel_entries / documents should succeed for that vehicle_id.
--   User B insert/update should fail unless role is manager.
--
-- Storage paths
-- -------------
-- Upload to bucket `vehicle-documents` with path `<user_a_uuid>/rc.pdf` using User A token — OK.
-- Same path with User B token — expect storage RLS violation.
--
-- Public garage reads
-- -------------------
-- Anonymous or any authenticated user:
--   select business_name from garages where is_demo = true;  -- seeded demo garages visible
-- Unpublished non-demo garage rows should not appear unless owner_user_id = auth.uid().
--
-- AI usage
-- --------
-- User A inserts ai_usage_events for self — OK.
-- User A cannot select ai_usage_events where user_id = User B.
--
-- Subscription entitlements
-- -------------------------
-- Each signup creates one subscription_entitlements row via handle_new_user trigger.
-- User A cannot select User B entitlement row.
--
-- Service role bypass (admin scripts only)
-- ----------------------------------------
-- The Supabase service_role key bypasses RLS — never embed in mobile app.
-- Use only in Edge Functions / server jobs when explicitly required.
--
-- Quick SQL session impersonation (psql)
-- --------------------------------------
--   set request.jwt.claim.sub = '<user_a_uuid>';
--   set role authenticated;
--   select * from public.fuel_entries;
-- Reset with: reset role;

select 'RLS verification notes migration applied' as note;


-- ============================================================
-- SEED DATA
-- ============================================================
-- DriveMate LK seed data

-- expense_categories
insert into public.expense_categories (slug, label, sort_order) values
  ('fuel', 'Fuel', 1),
  ('service', 'Service', 2),
  ('repair', 'Repair', 3),
  ('insurance', 'Insurance', 4),
  ('revenue_licence', 'Revenue Licence', 5),
  ('emission_test', 'Emission Test', 6),
  ('tires', 'Tires', 7),
  ('battery', 'Battery', 8),
  ('parking', 'Parking', 9),
  ('highway_toll', 'Highway Toll', 10),
  ('cleaning', 'Cleaning', 11),
  ('accessories', 'Accessories', 12),
  ('modification', 'Modification', 13),
  ('leasing', 'Leasing', 14),
  ('inspection', 'Inspection', 15),
  ('roadside_assistance', 'Roadside Assistance', 16),
  ('other', 'Other', 99)
on conflict (slug) do nothing;

-- maintenance_templates
insert into public.maintenance_templates (
  maintenance_type, title, description, default_interval_months, default_interval_km, priority
) values
  ('engine_oil', 'Engine Oil Change', 'Replace engine oil and oil filter per manufacturer interval.', 6, 5000, 'high'),
  ('oil_filter', 'Oil Filter Replacement', 'Replace oil filter during oil change or as recommended.', 6, 5000, 'medium'),
  ('air_filter', 'Air Filter Replacement', 'Inspect and replace engine air filter for fuel economy and performance.', 12, 15000, 'medium'),
  ('cabin_filter', 'Cabin / AC Filter', 'Replace cabin filter for AC airflow and air quality.', 12, 15000, 'low'),
  ('brake_inspection', 'Brake Inspection', 'Inspect pads, discs, and brake fluid condition.', 12, 20000, 'high'),
  ('brake_fluid', 'Brake Fluid Service', 'Replace brake fluid to maintain stopping performance.', 24, 40000, 'high'),
  ('tires', 'Tire Rotation & Inspection', 'Rotate tires and check tread depth and pressure.', 6, 10000, 'medium'),
  ('wheel_alignment', 'Wheel Alignment', 'Check alignment after pothole damage or uneven tire wear.', 12, null, 'medium'),
  ('battery', 'Battery Check', 'Test battery health; tropical heat reduces lifespan in Sri Lanka.', 12, null, 'medium'),
  ('coolant', 'Coolant / Radiator Service', 'Inspect coolant level and condition; flush per schedule.', 24, 40000, 'medium'),
  ('transmission_fluid', 'Transmission Fluid', 'Inspect or replace automatic transmission fluid.', 36, 60000, 'medium'),
  ('spark_plugs', 'Spark Plugs', 'Replace spark plugs on petrol engines as per service book.', 36, 60000, 'medium'),
  ('timing_belt', 'Timing Belt / Chain Inspection', 'Critical on many Japanese re-imports; follow manufacturer km limit.', 60, 100000, 'critical'),
  ('general_service', 'General Periodic Service', 'Full periodic service per manufacturer schedule.', 6, 5000, 'high')
on conflict (maintenance_type) do nothing;

-- inspection checklist
insert into public.inspection_checklists (slug, title, description, inspection_purpose, is_demo)
values (
  'owner-annual-check',
  'Annual Owner Inspection',
  'Practical checklist for Sri Lankan owners covering documents, fluids, brakes, tires, and lights.',
  'owner_check',
  true
)
on conflict (slug) do nothing;

insert into public.inspection_checklist_items (checklist_id, category, item, sort_order, guidance)
select c.id, v.category, v.item, v.sort_order, v.guidance
from public.inspection_checklists c
cross join (
  values
    ('Documents', 'Registration certificate present and readable', 1, 'Match reg number with windscreen sticker.'),
    ('Documents', 'Insurance valid', 2, 'Check expiry against policy document.'),
    ('Documents', 'Revenue licence current', 3, 'Confirm sticker on windscreen.'),
    ('Exterior', 'Body panels and paint', 10, 'Look for rust near wheel arches and door sills.'),
    ('Exterior', 'Windscreen and wipers', 11, 'Check cracks and wiper rubber condition.'),
    ('Lights', 'Headlights and indicators', 20, 'Test low/high beam and hazard lights.'),
    ('Engine Bay', 'Engine oil level and leaks', 30, 'Check on level ground after engine off 5 min.'),
    ('Engine Bay', 'Coolant level', 31, 'Never open radiator cap when hot.'),
    ('Brakes', 'Pad/disc wear and pedal feel', 40, 'Spongy pedal needs immediate professional check.'),
    ('Tires', 'Tread depth and sidewalls', 50, 'Legal minimum 1.6 mm; replace sooner in wet season.'),
    ('Underbody', 'Exhaust and suspension', 60, 'Listen for clunks on bumps.'),
    ('Interior', 'Dashboard warning lights at startup', 70, 'Note any lights that stay on after start.'),
    ('Road Test', 'Steering vibration and braking', 80, 'Test at low speed in safe area first.')
) as v(category, item, sort_order, guidance)
where c.slug = 'owner-annual-check'
  and not exists (
    select 1 from public.inspection_checklist_items i
    where i.checklist_id = c.id and i.item = v.item
  );

-- demo garages (Colombo / Kandy / Galle)
with garage_seed as (
  insert into public.garages (
    business_name, description, verification_status, phone, email,
    supported_vehicle_types, supported_makes, service_categories,
    rating, review_count, emergency_support, mobile_service,
    price_range, is_demo, is_published, is_active
  ) values
    (
      'Colombo City Auto Care (Demo)',
      'Full-service workshop for Japanese and European cars in Colombo 05. Demo listing for DriveMate LK.',
      'demo', '+94112345678', 'demo.colombo.auto@drivemate.lk',
      array['car','suv','van','hybrid'], array['Toyota','Honda','Nissan','Suzuki'],
      array['general_service','diagnostics','brakes','ac_repair'],
      4.50, 128, true, false, 'mid', true, true, true
    ),
    (
      'Wellawatta Hybrid Specialists (Demo)',
      'Hybrid battery checks, inverter cooling, and Toyota Aqua/Axio service. Demo listing.',
      'demo', '+94112345679', 'demo.wellawatta.hybrid@drivemate.lk',
      array['car','hybrid','ev'], array['Toyota','Honda'],
      array['hybrid_service','diagnostics','engine_oil'],
      4.70, 96, false, true, 'premium', true, true, true
    ),
    (
      'Nugegoda Express Lube (Demo)',
      'Quick oil changes, filters, and AC gas top-ups. Demo listing.',
      'demo', '+94112345680', 'demo.nugegoda.lube@drivemate.lk',
      array['car','suv','van','three_wheeler'], array['Toyota','Suzuki','Tata'],
      array['engine_oil','filters','ac_repair'],
      4.20, 54, false, false, 'budget', true, true, true
    ),
    (
      'Kandy Hill Motor Works (Demo)',
      'Brake, suspension, and hill-country vehicle prep. Demo listing in Kandy.',
      'demo', '+94812345681', 'demo.kandy.motor@drivemate.lk',
      array['car','suv','van','truck'], array['Toyota','Mitsubishi','Isuzu'],
      array['brakes','suspension','general_service','diagnostics'],
      4.60, 73, true, false, 'mid', true, true, true
    ),
    (
      'Peradeniya Tyre & Alignment Hub (Demo)',
      'Tyres, wheel alignment, and balancing for central province drivers. Demo listing.',
      'demo', '+94812345682', 'demo.peradeniya.tyre@drivemate.lk',
      array['car','suv','van','motorcycle'], array['Toyota','Nissan','BMW'],
      array['tires','wheel_alignment'],
      4.40, 41, false, true, 'mid', true, true, true
    ),
    (
      'Galle Coastal Car Clinic (Demo)',
      'Rust prevention, AC, and salt-air corrosion checks for southern drivers. Demo listing.',
      'demo', '+94912345683', 'demo.galle.clinic@drivemate.lk',
      array['car','suv','van'], array['Toyota','Honda','Mazda'],
      array['general_service','bodywork','ac_repair','diagnostics'],
      4.30, 62, false, false, 'mid', true, true, true
    ),
    (
      'Unawatuna Beachside Garage (Demo)',
      'Tourist-area friendly service with pickup options. Demo listing.',
      'demo', '+94912345684', 'demo.unawatuna.garage@drivemate.lk',
      array['car','suv','van','motorcycle'], array['Toyota','Suzuki','Hyundai'],
      array['general_service','engine_oil','brakes'],
      4.10, 29, false, true, 'budget', true, true, true
    )
  returning id, business_name
)
insert into public.garage_locations (garage_id, address, district, latitude, longitude, is_primary)
select g.id, l.address, l.district, l.latitude, l.longitude, true
from garage_seed g
join (
  values
    ('Colombo City Auto Care (Demo)', '45 Havelock Road, Colombo 05', 'Colombo', 6.8920, 79.8650),
    ('Wellawatta Hybrid Specialists (Demo)', '210 Galle Road, Wellawatta', 'Colombo', 6.8720, 79.8570),
    ('Nugegoda Express Lube (Demo)', '12 Stanley Thilakarathna Mawatha, Nugegoda', 'Colombo', 6.8650, 79.9000),
    ('Kandy Hill Motor Works (Demo)', '88 Peradeniya Road, Kandy', 'Kandy', 7.2906, 80.6337),
    ('Peradeniya Tyre & Alignment Hub (Demo)', '5 New Town, Peradeniya', 'Kandy', 7.2690, 80.5950),
    ('Galle Coastal Car Clinic (Demo)', '33 Wakwella Road, Galle', 'Galle', 6.0535, 80.2210),
    ('Unawatuna Beachside Garage (Demo)', 'Station Road, Unawatuna', 'Galle', 6.0090, 80.2500)
) as l(name, address, district, latitude, longitude)
  on l.name = g.business_name;

-- garage services for demo workshops
insert into public.garage_services (garage_id, service_category, description, price_from_minor, currency)
select g.id, s.category, s.description, s.price_from, 'LKR'
from public.garages g
join (
  values
    ('Colombo City Auto Care (Demo)', 'general_service', 'Full periodic service', 850000),
    ('Colombo City Auto Care (Demo)', 'diagnostics', 'OBD scan and report', 350000),
    ('Kandy Hill Motor Works (Demo)', 'brakes', 'Front brake pad replacement', 1200000),
    ('Galle Coastal Car Clinic (Demo)', 'bodywork', 'Underbody anti-rust treatment', 1500000)
) as s(garage_name, category, description, price_from)
  on g.business_name = s.garage_name;

-- demo roadside providers
insert into public.roadside_providers (
  name, description, phone, email, district, latitude, longitude,
  service_types, is_verified, is_demo, rating
) values
  (
    'Lanka Rescue Towing (Demo)',
    '24/7 towing coverage across Western Province. Demo provider for app testing.',
    '+94771234501', 'demo.towing@drivemate.lk', 'Colombo', 6.9271, 79.8612,
    array['towing','mechanical_breakdown','accident'], true, true, 4.5
  ),
  (
    'Central Province Road Assist (Demo)',
    'Battery jump-start and flat tyre help in Kandy district. Demo provider.',
    '+94771234502', 'demo.kandy.assist@drivemate.lk', 'Kandy', 7.2906, 80.6337,
    array['battery_jump','flat_tire','fuel_delivery','lockout'], true, true, 4.3
  ),
  (
    'Southern Coast Breakdown Help (Demo)',
    'Coastal breakdown and accident support Galle to Matara. Demo provider.',
    '+94771234503', 'demo.south.coast@drivemate.lk', 'Galle', 6.0535, 80.2210,
    array['towing','flat_tire','mechanical_breakdown','accident'], true, true, 4.2
  )
on conflict do nothing;

insert into public.roadside_services (provider_id, service_type, description, base_fee_minor, currency)
select p.id, s.service_type, s.description, s.base_fee, 'LKR'
from public.roadside_providers p
join (
  values
    ('Lanka Rescue Towing (Demo)', 'towing', 'Standard light vehicle tow within Colombo', 750000),
    ('Central Province Road Assist (Demo)', 'battery_jump', 'Jump-start with portable booster', 250000),
    ('Southern Coast Breakdown Help (Demo)', 'flat_tire', 'Spare tyre change on-site', 350000)
) as s(provider_name, service_type, description, base_fee)
  on p.name = s.provider_name;

-- demo partner offer
insert into public.partner_offers (
  partner_name, title, description, offer_code, discount_summary,
  valid_until, is_demo
) values (
  'DriveMate LK Partners',
  'Welcome Premium Trial (Demo)',
  'Demo offer shown in subscription upsell screens.',
  'DEMO-PREMIUM-30',
  '30-day premium trial for new users',
  current_date + interval '365 days',
  true
)
on conflict do nothing;


-- ============================================================
-- FILE: FIX_ONBOARDING_RLS.sql (appended)
-- ============================================================
-- DriveMate LK: fix onboarding profile + vehicles RLS
-- Run this in Supabase SQL Editor if vehicle insert / Done fails.

-- ---------------------------------------------------------------------------
-- Profiles: allow users to create their own row (signup trigger may have missed)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Backfill profiles for existing auth users missing a row
insert into public.profiles (id, email, full_name)
select
  u.id,
  coalesce(u.email, u.id::text || '@unknown.local'),
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, 'driver'), '@', 1)
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into public.user_settings (user_id)
select u.id
from auth.users u
left join public.user_settings s on s.user_id = u.id
where s.user_id is null
on conflict (user_id) do nothing;

insert into public.notification_preferences (user_id)
select u.id
from auth.users u
left join public.notification_preferences n on n.user_id = u.id
where n.user_id is null
on conflict (user_id) do nothing;

insert into public.subscription_entitlements (user_id)
select u.id
from auth.users u
left join public.subscription_entitlements e on e.user_id = u.id
where e.user_id is null
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Vehicles: owner can always read/update own rows (fixes INSERT … RETURNING)
-- ---------------------------------------------------------------------------
drop policy if exists "Users view accessible vehicles" on public.vehicles;
create policy "Users view accessible vehicles"
  on public.vehicles for select
  using (
    auth.uid() = user_id
    or public.user_can_access_vehicle(id)
  );

drop policy if exists "Users insert own vehicles" on public.vehicles;
create policy "Users insert own vehicles"
  on public.vehicles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Managers update accessible vehicles" on public.vehicles;
create policy "Managers update accessible vehicles"
  on public.vehicles for update
  using (
    auth.uid() = user_id
    or public.user_can_manage_vehicle(id)
  )
  with check (
    auth.uid() = user_id
    or public.user_can_manage_vehicle(id)
  );

-- Avoid recursive RLS inside access helpers / vehicle bootstrap trigger
alter function public.user_can_access_vehicle(uuid) set row_security = off;
alter function public.user_can_manage_vehicle(uuid) set row_security = off;
alter function public.handle_new_vehicle() set row_security = off;
alter function public.handle_new_user() set row_security = off;

-- Owner can insert their membership row (trigger is security definer, but keep policy safe)
drop policy if exists "Owners insert own membership" on public.vehicle_members;
create policy "Owners insert own membership"
  on public.vehicle_members for insert
  with check (
    auth.uid() = user_id
    and role = 'owner'
  );
