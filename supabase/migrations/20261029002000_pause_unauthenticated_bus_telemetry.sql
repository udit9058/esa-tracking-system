alter table public.bus_telemetry enable row level security;

drop policy if exists "Public can read bus telemetry" on public.bus_telemetry;
drop policy if exists "Public can insert bus telemetry" on public.bus_telemetry;
drop policy if exists "Public can update bus telemetry" on public.bus_telemetry;

revoke all privileges on table public.bus_telemetry from public, anon, authenticated;
