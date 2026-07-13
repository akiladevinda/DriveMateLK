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
