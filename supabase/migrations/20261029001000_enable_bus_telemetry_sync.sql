create table if not exists public.bus_telemetry (
  bus_number integer primary key,
  stage1_reported boolean not null default false,
  stage1_time text,
  food_loaded boolean not null default false,
  sticker_pasted boolean not null default false,
  first_aid_loaded boolean not null default false,
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
  return_reached_drop boolean not null default false,
  return_drop_time text,
  ngo_undertaking_signed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.bus_telemetry
  add column if not exists stage1_reported boolean not null default false,
  add column if not exists stage1_time text,
  add column if not exists food_loaded boolean not null default false,
  add column if not exists sticker_pasted boolean not null default false,
  add column if not exists first_aid_loaded boolean not null default false,
  add column if not exists stage3_departed boolean not null default false,
  add column if not exists stage3_time text,
  add column if not exists stage4_reached_pickup boolean not null default false,
  add column if not exists stage4_time text,
  add column if not exists onboard_boys integer not null default 0,
  add column if not exists onboard_girls integer not null default 0,
  add column if not exists onboard_ngo integer not null default 0,
  add column if not exists stage5_boarded boolean not null default false,
  add column if not exists stage6_reached_nmacc boolean not null default false,
  add column if not exists stage6_time text,
  add column if not exists stage7_seated boolean not null default false,
  add column if not exists stage7_time text,
  add column if not exists return_departed boolean not null default false,
  add column if not exists return_departed_time text,
  add column if not exists return_boys integer not null default 0,
  add column if not exists return_girls integer not null default 0,
  add column if not exists return_ngo integer not null default 0,
  add column if not exists return_reached_drop boolean not null default false,
  add column if not exists return_drop_time text,
  add column if not exists ngo_undertaking_signed boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.bus_telemetry enable row level security;

drop policy if exists "Public can read bus telemetry" on public.bus_telemetry;
drop policy if exists "Public can insert bus telemetry" on public.bus_telemetry;
drop policy if exists "Public can update bus telemetry" on public.bus_telemetry;
revoke all privileges on table public.bus_telemetry from public, anon, authenticated;
