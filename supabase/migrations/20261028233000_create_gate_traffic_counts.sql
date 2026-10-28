-- This table uses public anon-key access for operational headcounts, as selected.
create table if not exists public.gate_traffic_counts (
  gate_name text not null check (gate_name in ('Gate 11', 'Gate 18', 'Gate 20')),
  time_slot text not null check (
    time_slot in (
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
      '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
      '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00'
    )
  ),
  guest_count integer not null default 0 check (guest_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (gate_name, time_slot)
);

alter table public.gate_traffic_counts enable row level security;

grant select, insert, update on public.gate_traffic_counts to anon, authenticated;

drop policy if exists "Public can read gate traffic counts" on public.gate_traffic_counts;
create policy "Public can read gate traffic counts"
  on public.gate_traffic_counts
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can insert gate traffic counts" on public.gate_traffic_counts;
create policy "Public can insert gate traffic counts"
  on public.gate_traffic_counts
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public can update gate traffic counts" on public.gate_traffic_counts;
create policy "Public can update gate traffic counts"
  on public.gate_traffic_counts
  for update
  to anon, authenticated
  using (true)
  with check (true);
