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
