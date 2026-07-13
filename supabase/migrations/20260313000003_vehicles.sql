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
