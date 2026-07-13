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
