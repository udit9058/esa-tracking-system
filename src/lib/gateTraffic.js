import { supabase } from './supabaseClient';
import { GATE_TIME_SLOTS } from '../utils/masterLogisticData';

export const GATE_TRAFFIC_STORAGE_KEY = 'esa_alina_2026_gate_traffic_v1';
export const GATE_NAMES = ['Gate 11', 'Gate 18', 'Gate 20'];
const TABLE_NAME = 'gate_traffic_counts';

export function createEmptyGateTrafficData(timeSlots = GATE_TIME_SLOTS) {
  return Object.fromEntries(
    GATE_NAMES.map((gateName) => [
      gateName,
      Object.fromEntries(timeSlots.map((timeSlot) => [timeSlot, 0]))
    ])
  );
}

export function mapGateTrafficRows(rows, timeSlots = GATE_TIME_SLOTS) {
  const trafficData = createEmptyGateTrafficData(timeSlots);

  for (const row of rows || []) {
    if (trafficData[row.gate_name] && timeSlots.includes(row.time_slot)) {
      trafficData[row.gate_name][row.time_slot] = Number(row.guest_count) || 0;
    }
  }

  return trafficData;
}

export function getLocalGateTrafficData(timeSlots = GATE_TIME_SLOTS) {
  const trafficData = createEmptyGateTrafficData(timeSlots);

  try {
    const saved = localStorage.getItem(GATE_TRAFFIC_STORAGE_KEY);
    if (!saved) return trafficData;

    const parsed = JSON.parse(saved);
    for (const gateName of GATE_NAMES) {
      for (const timeSlot of timeSlots) {
        trafficData[gateName][timeSlot] = Number(parsed?.[gateName]?.[timeSlot]) || 0;
      }
    }
  } catch (error) {
    console.error('Unable to read locally cached gate counts:', error);
  }

  return trafficData;
}

export function saveLocalGateTrafficData(trafficData) {
  localStorage.setItem(GATE_TRAFFIC_STORAGE_KEY, JSON.stringify(trafficData));
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Gate counts cannot sync across devices.');
  }
  return supabase;
}

export async function fetchGateTrafficData() {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('gate_name, time_slot, guest_count');

  if (error) {
    throw new Error(`Could not load gate counts from Supabase: ${error.message}`);
  }

  return mapGateTrafficRows(data);
}

function toRows(gateName, counts, timeSlots = GATE_TIME_SLOTS) {
  if (!GATE_NAMES.includes(gateName)) {
    throw new Error(`Unknown gate: ${gateName}`);
  }

  return timeSlots.map((timeSlot) => ({
    gate_name: gateName,
    time_slot: timeSlot,
    guest_count: normalizeGuestCount(counts?.[timeSlot]),
    updated_at: new Date().toISOString()
  }));
}

function normalizeGuestCount(value) {
  const guestCount = value === '' || value == null ? 0 : Number(value);
  if (!Number.isSafeInteger(guestCount) || guestCount < 0 || guestCount > 2147483647) {
    throw new Error('Guest counts must be whole numbers from 0 to 2,147,483,647.');
  }
  return guestCount;
}

async function upsertRows(rows) {
  const client = requireSupabase();
  const { error } = await client
    .from(TABLE_NAME)
    .upsert(rows, { onConflict: 'gate_name,time_slot' });

  if (error) {
    throw new Error(`Could not save gate counts to Supabase: ${error.message}`);
  }
}

export async function saveGateTrafficCounts(gateName, counts) {
  await upsertRows(toRows(gateName, counts));
}

export async function saveGateTrafficCells(changes) {
  const updatedAt = new Date().toISOString();
  const rows = changes.map(({ gateName, timeSlot, guestCount }) => {
    if (!GATE_NAMES.includes(gateName) || !GATE_TIME_SLOTS.includes(timeSlot)) {
      throw new Error('Cannot save a count for an unknown gate or time slot.');
    }

    return {
      gate_name: gateName,
      time_slot: timeSlot,
      guest_count: normalizeGuestCount(guestCount),
      updated_at: updatedAt
    };
  });

  await upsertRows(rows);
}
