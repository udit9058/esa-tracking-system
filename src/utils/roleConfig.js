export const ROLES = {
  BUS_IC: 'bus_ic',
  NGO_IC: 'ngo_ic',
  DEPOT_IC: 'depot_ic',
  GUARD: 'guard',
  ZONAL_IC: 'zonal_ic',
  CONTROL_ROOM: 'global_control_room_ic',
};

export const ROLE_LABELS = {
  [ROLES.BUS_IC]: 'Bus Incharge (Bus IC)',
  [ROLES.NGO_IC]: 'NGO Incharge (NGO IC)',
  [ROLES.DEPOT_IC]: 'Depot Incharge (Depot IC)',
  [ROLES.GUARD]: 'Security Gate Guard',
  [ROLES.ZONAL_IC]: 'Zonal Incharge (Zonal IC)',
  [ROLES.CONTROL_ROOM]: 'Global Control Room IC',
};

export const ROLE_DEFAULT_ROUTES = {
  [ROLES.BUS_IC]: '/dashboard/bus',
  [ROLES.NGO_IC]: '/dashboard/ngo',
  [ROLES.DEPOT_IC]: '/dashboard/depot',
  [ROLES.GUARD]: '/dashboard/guard',
  [ROLES.ZONAL_IC]: '/dashboard/zonal',
  [ROLES.CONTROL_ROOM]: '/dashboard/control-room',
};

export const REPORT_STAGES = [
  { stage: 1, code: 'DEPOT_BUS_IC_ARRIVAL', title: 'Report 1: Bus IC Arrival at Depot', submittedByRole: ROLES.DEPOT_IC },
  { stage: 2, code: 'DEPOT_READINESS', title: 'Report 2: Depot Readiness Checklist', submittedByRole: ROLES.DEPOT_IC },
  { stage: 3, code: 'PICKUP_COMPLETED', title: 'Report 3: Pickup Completed', submittedByRole: ROLES.BUS_IC },
  { stage: 4, code: 'STADIUM_ARRIVAL', title: 'Report 4: Stadium Arrival', submittedByRole: ROLES.BUS_IC },
  { stage: 5, code: 'CHILDREN_SEATED', title: 'Report 5: Children Seated Safely', submittedByRole: ROLES.BUS_IC },
  { stage: 6, code: 'STADIUM_DEPARTURE', title: 'Report 6: Departure from Stadium', submittedByRole: ROLES.BUS_IC },
  { stage: 7, code: 'DROPOFF_COMPLETED', title: 'Report 7: Drop-Off Completed', submittedByRole: ROLES.BUS_IC },
];

export function normalizePhoneNumber(rawInput) {
  if (!rawInput) return '';
  const digitsOnly = rawInput.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }
  return rawInput.startsWith('+') ? rawInput.trim() : `+${digitsOnly}`;
}
