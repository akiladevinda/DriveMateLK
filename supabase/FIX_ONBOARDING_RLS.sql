-- DriveMate LK: FIX vehicle create RLS (run in Supabase SQL Editor)
-- This is the definitive fix for:
--   new row violates row-level security policy for table "vehicles"

-- ---------------------------------------------------------------------------
-- 1) Privileges
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.vehicle_members to authenticated;
grant select, insert, update, delete on public.vehicle_timeline_events to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_settings to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Profiles (needed for onboarding Done)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

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

-- ---------------------------------------------------------------------------
-- 3) Rebuild vehicle policies (simple + reliable)
-- ---------------------------------------------------------------------------
drop policy if exists "Users view accessible vehicles" on public.vehicles;
drop policy if exists "Users insert own vehicles" on public.vehicles;
drop policy if exists "Managers update accessible vehicles" on public.vehicles;
drop policy if exists "Owners delete own vehicles" on public.vehicles;

create policy "Users view accessible vehicles"
  on public.vehicles for select
  to authenticated
  using (auth.uid() = user_id or public.user_can_access_vehicle(id));

create policy "Users insert own vehicles"
  on public.vehicles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Managers update accessible vehicles"
  on public.vehicles for update
  to authenticated
  using (auth.uid() = user_id or public.user_can_manage_vehicle(id))
  with check (auth.uid() = user_id or public.user_can_manage_vehicle(id));

create policy "Owners delete own vehicles"
  on public.vehicles for delete
  to authenticated
  using (auth.uid() = user_id);

-- Membership insert for owner bootstrap
drop policy if exists "Owners insert own membership" on public.vehicle_members;
create policy "Owners insert own membership"
  on public.vehicle_members for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Timeline: allow owner insert
drop policy if exists "Timeline event access" on public.vehicle_timeline_events;
create policy "Timeline event access"
  on public.vehicle_timeline_events for all
  to authenticated
  using (auth.uid() = user_id or public.user_can_access_vehicle(vehicle_id))
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4) Hardening helpers / trigger (no recursive RLS)
-- ---------------------------------------------------------------------------
create or replace function public.user_can_access_vehicle(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
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
set row_security = off
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

create or replace function public.handle_new_vehicle()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
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

drop trigger if exists on_vehicle_created on public.vehicles;
create trigger on_vehicle_created
  after insert on public.vehicles
  for each row execute function public.handle_new_vehicle();

grant execute on function public.user_can_access_vehicle(uuid) to authenticated;
grant execute on function public.user_can_manage_vehicle(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) RPC: create vehicle as the signed-in user (bypasses flaky INSERT+RETURNING)
-- ---------------------------------------------------------------------------
create or replace function public.create_own_vehicle(payload jsonb)
returns public.vehicles
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.vehicles;
  v_is_primary boolean := coalesce((payload->>'is_primary')::boolean, true);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_is_primary then
    update public.vehicles
    set is_primary = false
    where user_id = v_user_id
      and is_primary = true;
  end if;

  insert into public.vehicles (
    user_id,
    nickname,
    registration_number,
    make,
    model,
    variant,
    manufacture_year,
    registration_year,
    vehicle_type,
    fuel_type,
    transmission,
    engine_capacity_cc,
    vin,
    chassis_number,
    engine_number,
    color,
    current_odometer,
    odometer_unit,
    purchase_date,
    purchase_price_minor,
    purchase_currency,
    ownership_type,
    financing_status,
    previous_owners_count,
    notes,
    main_image_url,
    is_primary
  ) values (
    v_user_id,
    nullif(payload->>'nickname', ''),
    upper(trim(payload->>'registration_number')),
    trim(payload->>'make'),
    trim(payload->>'model'),
    nullif(payload->>'variant', ''),
    coalesce((payload->>'manufacture_year')::integer, extract(year from now())::integer),
    nullif(payload->>'registration_year', '')::integer,
    coalesce(payload->>'vehicle_type', 'car'),
    coalesce(payload->>'fuel_type', 'petrol'),
    coalesce(payload->>'transmission', 'manual'),
    nullif(payload->>'engine_capacity_cc', '')::integer,
    nullif(payload->>'vin', ''),
    nullif(payload->>'chassis_number', ''),
    nullif(payload->>'engine_number', ''),
    nullif(payload->>'color', ''),
    coalesce((payload->>'current_odometer')::numeric, 0),
    coalesce(payload->>'odometer_unit', 'km'),
    nullif(payload->>'purchase_date', '')::date,
    nullif(payload->>'purchase_price_minor', '')::integer,
    coalesce(payload->>'purchase_currency', 'LKR'),
    coalesce(payload->>'ownership_type', 'owned'),
    coalesce(payload->>'financing_status', 'none'),
    nullif(payload->>'previous_owners_count', '')::integer,
    nullif(payload->>'notes', ''),
    nullif(payload->>'main_image_url', ''),
    v_is_primary
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_own_vehicle(jsonb) from public;
grant execute on function public.create_own_vehicle(jsonb) to authenticated;
