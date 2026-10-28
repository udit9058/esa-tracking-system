alter table public.bus_sync_users
  drop constraint if exists bus_sync_users_role_check,
  drop constraint if exists bus_sync_users_assignment_check;

alter table public.bus_sync_users
  add constraint bus_sync_users_role_check
    check (role in ('bus_ic', 'control_room_ic', 'depot_ic', 'ngo_ic', 'guard')),
  add constraint bus_sync_users_assignment_check
    check (
      (role = 'bus_ic' and bus_number between 1 and 10)
      or (role <> 'bus_ic' and bus_number is null)
    );

insert into public.bus_sync_users (phone, role, bus_number) values
  ('8780675140', 'control_room_ic', null),
  ('9867679391', 'control_room_ic', null),
  ('9029080111', 'control_room_ic', null),
  ('9213004210', 'control_room_ic', null),
  ('9596452140', 'control_room_ic', null),
  ('7021797186', 'depot_ic', null),
  ('9779063912', 'depot_ic', null),
  ('9769066795', 'depot_ic', null),
  ('6000725674', 'depot_ic', null),
  ('7021187325', 'depot_ic', null),
  ('9149944734', 'bus_ic', 1),
  ('9711985453', 'bus_ic', 2),
  ('9430761564', 'bus_ic', 3),
  ('7719871163', 'bus_ic', 4),
  ('8451985598', 'bus_ic', 5),
  ('7051783275', 'bus_ic', 6),
  ('6005448871', 'bus_ic', 7),
  ('9205641602', 'bus_ic', 8),
  ('9082269634', 'bus_ic', 9),
  ('9653397714', 'bus_ic', 10),
  ('9880156418', 'guard', null)
on conflict (phone) do update
set role = excluded.role,
    bus_number = excluded.bus_number,
    active = true;
