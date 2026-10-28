create table if not exists public.bus_telemetry (
  bus_number integer primary key,
  stage1_reported boolean not null default false,
  stage1_time text,
  food_loaded boolean not null default false,
  sticker_pasted boolean not null default false,
  first_aid_loaded boolean not null default false,
  supplies_issue_reason text,
  stage3_departed boolean not null default false,
  stage3_time text,
  stage4_reached_pickup boolean not null default false,
  stage4_time text,
  onboard_boys integer not null default 0 check (onboard_boys >= 0),
  onboard_girls integer not null default 0 check (onboard_girls >= 0),
  onboard_ngo integer not null default 0 check (onboard_ngo >= 0),
  stage5_boarded boolean not null default false,
  stage6_reached_nmacc boolean not null default false,
  stage6_time text,
  stage7_seated boolean not null default false,
  stage7_time text,
  return_departed boolean not null default false,
  return_departed_time text,
  return_boys integer not null default 0 check (return_boys >= 0),
  return_girls integer not null default 0 check (return_girls >= 0),
  return_ngo integer not null default 0 check (return_ngo >= 0),
  return_headcount_verified boolean not null default false,
  return_headcount_time text,
  return_reached_drop boolean not null default false,
  return_drop_time text,
  ngo_undertaking_signed boolean not null default false,
  ngo_feedback_note text,
  ngo_poc_signature text,
  ngo_undertaking_time text,
  updated_at timestamptz not null default now()
);

alter table public.bus_telemetry
  add column if not exists supplies_issue_reason text,
  add column if not exists return_headcount_verified boolean not null default false,
  add column if not exists return_headcount_time text,
  add column if not exists ngo_feedback_note text,
  add column if not exists ngo_poc_signature text,
  add column if not exists ngo_undertaking_time text;

create table if not exists public.bus_sync_users (
  phone text primary key check (phone ~ '^[0-9]{10}$'),
  role text not null check (role in ('bus_ic', 'control_room_ic')),
  bus_number integer check (bus_number between 1 and 10),
  active boolean not null default true,
  constraint bus_sync_users_assignment_check check (
    (role = 'bus_ic' and bus_number is not null)
    or (role = 'control_room_ic' and bus_number is null)
  )
);

alter table public.bus_sync_users enable row level security;
revoke all privileges on table public.bus_sync_users from public, anon, authenticated;
grant select on table public.bus_sync_users to service_role;

insert into public.bus_sync_users (phone, role, bus_number) values
  ('8780675140', 'control_room_ic', null),
  ('9867679391', 'control_room_ic', null),
  ('9029080111', 'control_room_ic', null),
  ('9213004210', 'control_room_ic', null),
  ('9596452140', 'control_room_ic', null),
  ('9149944734', 'bus_ic', 1),
  ('9711985453', 'bus_ic', 2),
  ('9430761564', 'bus_ic', 3),
  ('7719871163', 'bus_ic', 4),
  ('8451985598', 'bus_ic', 5),
  ('7051783275', 'bus_ic', 6),
  ('6005448871', 'bus_ic', 7),
  ('9205641602', 'bus_ic', 8),
  ('9082269634', 'bus_ic', 9),
  ('9653397714', 'bus_ic', 10)
on conflict (phone) do update
set role = excluded.role,
    bus_number = excluded.bus_number,
    active = true;

create table if not exists public.bus_sync_login_attempts (
  phone text primary key check (phone ~ '^[0-9]{10}$'),
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now()
);

alter table public.bus_sync_login_attempts enable row level security;
revoke all privileges on table public.bus_sync_login_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.bus_sync_login_attempts to service_role;

create or replace function public.consume_bus_sync_login_attempt(
  p_phone text,
  p_success boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempt_count integer;
begin
  if p_success then
    delete from public.bus_sync_login_attempts where phone = p_phone;
    return true;
  end if;

  insert into public.bus_sync_login_attempts (phone, attempt_count, window_started_at)
  values (p_phone, 1, now())
  on conflict (phone) do update
  set attempt_count = case
        when public.bus_sync_login_attempts.window_started_at < now() - interval '15 minutes' then 1
        else public.bus_sync_login_attempts.attempt_count + 1
      end,
      window_started_at = case
        when public.bus_sync_login_attempts.window_started_at < now() - interval '15 minutes' then now()
        else public.bus_sync_login_attempts.window_started_at
      end
  returning attempt_count into current_attempt_count;

  return current_attempt_count <= 5;
end;
$$;

revoke all privileges on function public.consume_bus_sync_login_attempt(text, boolean) from public, anon, authenticated;
grant execute on function public.consume_bus_sync_login_attempt(text, boolean) to service_role;

create table if not exists public.bus_sync_sessions (
  token_hash text primary key,
  phone text not null references public.bus_sync_users(phone) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.bus_sync_sessions enable row level security;
revoke all privileges on table public.bus_sync_sessions from public, anon, authenticated;
grant select, insert, delete on table public.bus_sync_sessions to service_role;

alter table public.bus_telemetry enable row level security;
drop policy if exists "Public can read bus telemetry" on public.bus_telemetry;
drop policy if exists "Public can insert bus telemetry" on public.bus_telemetry;
drop policy if exists "Public can update bus telemetry" on public.bus_telemetry;
revoke all privileges on table public.bus_telemetry from public, anon, authenticated;
grant select, insert, update, delete on table public.bus_telemetry to service_role;

notify pgrst, 'reload schema';
