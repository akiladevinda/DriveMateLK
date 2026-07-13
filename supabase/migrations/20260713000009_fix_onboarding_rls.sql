-- DriveMate LK: fix onboarding profile + vehicles RLS

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users view accessible vehicles" on public.vehicles;
create policy "Users view accessible vehicles"
  on public.vehicles for select
  using (
    auth.uid() = user_id
    or public.user_can_access_vehicle(id)
  );

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

drop policy if exists "Owners insert own membership" on public.vehicle_members;
create policy "Owners insert own membership"
  on public.vehicle_members for insert
  with check (
    auth.uid() = user_id
    and role = 'owner'
  );

alter function public.user_can_access_vehicle(uuid) set row_security = off;
alter function public.user_can_manage_vehicle(uuid) set row_security = off;
alter function public.handle_new_vehicle() set row_security = off;
alter function public.handle_new_user() set row_security = off;
