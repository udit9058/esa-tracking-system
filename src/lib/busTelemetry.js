const LEGACY_BUS_FIELDS = {
  stage1_reported: 's1_reported_origin',
  stage1_time: 's1_time',
  food_loaded: 's2_food_loaded',
  sticker_pasted: 's2_sticker_pasted',
  first_aid_loaded: 's2_first_aid_loaded',
  supplies_issue_reason: 's2_issue_reason',
  stage3_departed: 's3_departed_origin',
  stage3_time: 's3_time',
  stage4_reached_pickup: 's4_reached_pickup',
  stage4_time: 's4_time',
  onboard_boys: 's5_onward_boys',
  onboard_girls: 's5_onward_girls',
  onboard_ngo: 's5_onward_ngo',
  stage5_boarded: 's5_headcount_verified',
  stage6_reached_nmacc: 's6_reached_nmacc',
  stage6_time: 's6_time',
  stage7_seated: 's7_seated_theater',
  stage7_time: 's7_time',
  return_departed: 'r1_started_from_nmacc',
  return_departed_time: 'r1_time',
  return_boys: 'r2_return_boys',
  return_girls: 'r2_return_girls',
  return_ngo: 'r2_return_ngo',
  return_headcount_verified: 'r2_headcount_verified',
  return_headcount_time: 'r2_time',
  return_reached_drop: 'r3_reached_drop',
  return_drop_time: 'r3_time',
  ngo_undertaking_signed: 'r4_ngo_undertaking',
  ngo_feedback_note: 'r4_ngo_feedback_note',
  ngo_poc_signature: 'r4_ngo_poc_signature',
  ngo_undertaking_time: 'r4_time'
};

export function normalizeBusTelemetry(bus, index = 0) {
  const parsedNumber = Number(
    bus.bus_number ||
    bus.busNumber ||
    bus.bus_no ||
    String(bus.id || '').replace(/\D/g, '')
  ) || index + 1;
  const normalized = {
    ...bus,
    bus_number: parsedNumber,
    busNumber: parsedNumber,
    id: `Bus #${parsedNumber}`,
    pickup_point: bus.pickup_point ?? bus.pickup_location
  };

  for (const [currentField, legacyField] of Object.entries(LEGACY_BUS_FIELDS)) {
    if (normalized[currentField] == null && bus[legacyField] != null) {
      normalized[currentField] = bus[legacyField];
    }
  }

  return normalized;
}
