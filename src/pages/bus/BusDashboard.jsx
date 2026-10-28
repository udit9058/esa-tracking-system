import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2 } from 'lucide-react';
import * as masterData from '../../utils/masterLogisticData';
import { readBusTelemetry, saveBusTelemetry } from '../../lib/busSync';
import { normalizeBusTelemetry } from '../../lib/busTelemetry';

function normalizeFleet(rawFleet) {
  const list = Array.isArray(rawFleet) && rawFleet.length > 0 ? rawFleet : (masterData.INITIAL_BUS_FLEET || []);
  return list.map(normalizeBusTelemetry);
}

export default function BusDashboard() {
  const auth = useAuth();
  const userProfile = auth?.profile || auth?.userProfile || {};

  // Detect assigned bus number from profile (e.g., bus_number: 1 or "Bus 01")
  const detectBusNumber = () => {
    if (userProfile?.bus_no || userProfile?.bus_number) {
      return Number(userProfile.bus_no || userProfile.bus_number);
    }
    const match = String(userProfile?.full_name || userProfile?.depot || '').match(/(\d+)/);
    return match ? Number(match[1]) : 1;
  };

  const assignedBusNum = detectBusNumber();

  const loadLocalFleet = () => {
    try {
      const s2 = localStorage.getItem('esa_alina_2026_fleet_v2');
      if (s2) return normalizeFleet(JSON.parse(s2));
      const s1 = localStorage.getItem('esa_alina_2026_fleet_v1');
      if (s1) return normalizeFleet(JSON.parse(s1));
    } catch (error) {
      console.warn('Unable to load cached bus fleet:', error);
    }
    return normalizeFleet(masterData.getLiveFleet ? masterData.getLiveFleet() : []);
  };

  const [fleet, setFleet] = useState(loadLocalFleet);
  const [journeyTab, setJourneyTab] = useState('onward'); // 'onward' | 'return'
  const [saveToast, setSaveToast] = useState('');
  const [syncError, setSyncError] = useState('');

  const currentBus = fleet.find(b => Number(b.bus_number) === Number(assignedBusNum)) || fleet[0] || {
    bus_number: assignedBusNum,
    id: `Bus #${assignedBusNum}`,
    depot: 'Anik / Kurla',
    ngo_name: 'Pratham',
    pickup_point: 'Kurla East - Nadikeshwar Temple Kamgar Nagar Kurla East -24'
  };

  const [boysInput, setBoysInput] = useState(currentBus.onboard_boys ?? 0);
  const [girlsInput, setGirlsInput] = useState(currentBus.onboard_girls ?? 0);
  const [nvInput, setNvInput] = useState(currentBus.onboard_ngo ?? 0);

  const [retBoysInput, setRetBoysInput] = useState(currentBus.return_boys ?? currentBus.onboard_boys ?? 0);
  const [retGirlsInput, setRetGirlsInput] = useState(currentBus.return_girls ?? currentBus.onboard_girls ?? 0);
  const [retNvInput, setRetNvInput] = useState(currentBus.return_ngo ?? currentBus.onboard_ngo ?? 0);

  const accessToken = userProfile.bus_sync_token;

  useEffect(() => {
    let active = true;
    let requestInFlight = false;

    const refreshTelemetry = async () => {
      if (!accessToken) {
        return;
      }
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const rows = await readBusTelemetry(accessToken);
        if (!active) return;
        const telemetry = rows.find((row) => Number(row.bus_number) === assignedBusNum);
        if (telemetry) {
          setFleet((currentFleet) => currentFleet.map((bus) =>
            Number(bus.bus_number) === assignedBusNum
              ? normalizeBusTelemetry({ ...bus, ...telemetry })
              : bus
          ));
        }
        setSyncError('');
      } catch (error) {
        console.error('Unable to load bus journey data from Supabase:', error);
        if (active) setSyncError(`Could not load the latest bus data: ${error.message}`);
      } finally {
        requestInFlight = false;
      }
    };

    if (!accessToken) return undefined;
    refreshTelemetry();
    const interval = setInterval(refreshTelemetry, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [accessToken, assignedBusNum]);

  useEffect(() => {
    setBoysInput(currentBus.onboard_boys ?? 0);
    setGirlsInput(currentBus.onboard_girls ?? 0);
    setNvInput(currentBus.onboard_ngo ?? 0);
    setRetBoysInput(currentBus.return_boys ?? currentBus.onboard_boys ?? 0);
    setRetGirlsInput(currentBus.return_girls ?? currentBus.onboard_girls ?? 0);
    setRetNvInput(currentBus.return_ngo ?? currentBus.onboard_ngo ?? 0);
  }, [currentBus.bus_number, currentBus.onboard_boys, currentBus.onboard_girls, currentBus.onboard_ngo, currentBus.return_boys, currentBus.return_girls, currentBus.return_ngo]);

  const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Save and overwrite journey changes on this device.
  const persistBusChanges = async (changes, toastText = 'Saved to Supabase!') => {
    const bNum = Number(currentBus.bus_number || assignedBusNum);
    const stamp = Date.now();

    const updatedFleet = fleet.map((item, idx) => {
      const itemNum = Number(item.bus_number || item.busNumber || idx + 1);
      if (itemNum === bNum) {
        return { ...item, ...changes, bus_number: bNum, busNumber: bNum, updatedAt: stamp };
      }
      return item;
    });

    setFleet(updatedFleet);
    const jsonStr = JSON.stringify(updatedFleet);
    localStorage.setItem('esa_alina_2026_fleet_v1', jsonStr);
    localStorage.setItem('esa_alina_2026_fleet_v2', jsonStr);

    if (masterData.saveLiveFleet) {
      masterData.saveLiveFleet(updatedFleet);
    }
    if (!accessToken) {
      setSaveToast('');
      setSyncError('Journey data is saved on this device only until secure bus sync is deployed.');
      return;
    }

    try {
      await saveBusTelemetry(accessToken, bNum, changes);
      setSyncError('');
      setSaveToast(toastText);
      setTimeout(() => setSaveToast(''), 2200);
    } catch (error) {
      console.error('Unable to save bus journey data to Supabase:', error);
      setSaveToast('');
      setSyncError(`Saved on this device, but Supabase sync failed: ${error.message}`);
    }
  };

  // Toggle checkbox: if clicked again, overwrites state and updates/clears time automatically
  const handleCheckboxToggle = (boolField, timeField, label) => {
    const nextVal = !currentBus[boolField];
    const nextTime = nextVal ? nowTime() : '';
    const payload = { [boolField]: nextVal };
    if (timeField) payload[timeField] = nextTime;
    persistBusChanges(payload, `${label} ${nextVal ? 'Checked ✓ (' + nextTime + ')' : 'Updated'}`);
  };

  const handleSupplyToggle = (field, label) => {
    const nextVal = !currentBus[field];
    persistBusChanges({ [field]: nextVal }, `${label}: ${nextVal ? 'Rakh di gayi ✓' : 'Unchecked'}`);
  };

  const handleHeadcountChange = (type, rawVal) => {
    const val = rawVal === '' ? 0 : Math.max(0, parseInt(rawVal, 10) || 0);
    if (type === 'boys') {
      setBoysInput(rawVal);
      persistBusChanges({ onboard_boys: val, stage5_boarded: true }, 'Boys count auto-saved!');
    } else if (type === 'girls') {
      setGirlsInput(rawVal);
      persistBusChanges({ onboard_girls: val, stage5_boarded: true }, 'Girls count auto-saved!');
    } else if (type === 'nv') {
      setNvInput(rawVal);
      persistBusChanges({ onboard_ngo: val, stage5_boarded: true }, 'NGO Volunteers count auto-saved!');
    }
  };

  const handleConfirmOnwardHeadcount = () => {
    const b = Math.max(0, parseInt(boysInput, 10) || 0);
    const g = Math.max(0, parseInt(girlsInput, 10) || 0);
    const v = Math.max(0, parseInt(nvInput, 10) || 0);
    persistBusChanges({
      onboard_boys: b,
      onboard_girls: g,
      onboard_ngo: v,
      stage5_boarded: true
    }, `Onward Headcount Verified (B:${b} | G:${g} | NV:${v}) ✓`);
  };

  const handleReturnHeadcountChange = (type, rawVal) => {
    const val = rawVal === '' ? 0 : Math.max(0, parseInt(rawVal, 10) || 0);
    if (type === 'boys') {
      setRetBoysInput(rawVal);
      persistBusChanges({ return_boys: val, onboard_boys: val }, 'Return Boys count auto-saved!');
    } else if (type === 'girls') {
      setRetGirlsInput(rawVal);
      persistBusChanges({ return_girls: val, onboard_girls: val }, 'Return Girls count auto-saved!');
    } else if (type === 'nv') {
      setRetNvInput(rawVal);
      persistBusChanges({ return_ngo: val, onboard_ngo: val }, 'Return Volunteers count auto-saved!');
    }
  };

  const handleConfirmReturnHeadcount = () => {
    const b = Math.max(0, parseInt(retBoysInput, 10) || 0);
    const g = Math.max(0, parseInt(retGirlsInput, 10) || 0);
    const v = Math.max(0, parseInt(retNvInput, 10) || 0);
    persistBusChanges({
      return_boys: b,
      return_girls: g,
      return_ngo: v,
      onboard_boys: b,
      onboard_girls: g,
      onboard_ngo: v
    }, `Return Headcount Verified (B:${b} | G:${g} | NV:${v}) ✓`);
  };

  // Helper for light-green background when a checkpoint is checked
  const getBoxClasses = (isChecked) =>
    `p-3 rounded border d-flex justify-content-between align-items-center mb-3 transition-all ${isChecked ? '' : 'bg-light'}`;

  const getBoxStyle = (isChecked) =>
    isChecked
      ? { backgroundColor: '#d1fae5', borderColor: '#10b981', borderWidth: '1.5px', transition: 'all 0.2s ease' }
      : { transition: 'all 0.2s ease' };

  const allSuppliesDone = Boolean(currentBus.food_loaded && currentBus.sticker_pasted && currentBus.first_aid_loaded);
  const onwardTotalPax = (parseInt(boysInput, 10) || 0) + (parseInt(girlsInput, 10) || 0) + (parseInt(nvInput, 10) || 0);
  const returnTotalPax = (parseInt(retBoysInput, 10) || 0) + (parseInt(retGirlsInput, 10) || 0) + (parseInt(retNvInput, 10) || 0);

  return (
    <div className="container-fluid py-3 px-3 px-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {saveToast && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 mb-3 shadow-sm">
          <CheckCircle2 size={18} />
          <span className="fw-bold small">{saveToast}</span>
        </div>
      )}
      {userProfile.bus_sync_warning && (
        <div className="alert alert-warning py-2 mb-3 shadow-sm">
          Signed in, but bus cloud sync is unavailable. Journey data is saved on this device only until the Supabase Edge Function is deployed.
        </div>
      )}
      {syncError && <div className="alert alert-danger py-2 mb-3 shadow-sm">{syncError}</div>}

      {/* TOP 2-BUTTON JOURNEY SWITCHER (Matches your screenshot layout) */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <button
            type="button"
            onClick={() => setJourneyTab('onward')}
            className={`btn w-100 py-3 fw-bold rounded-3 shadow-sm ${
              journeyTab === 'onward' ? 'btn-primary text-white' : 'btn-outline-primary bg-white'
            }`}
          >
            ✈️ 1. ONWARD JOURNEY TO NMACC (Stages 1 – 7)
          </button>
        </div>
        <div className="col-12 col-md-6">
          <button
            type="button"
            onClick={() => setJourneyTab('return')}
            className={`btn w-100 py-3 fw-bold rounded-3 shadow-sm ${
              journeyTab === 'return' ? 'btn-success text-white' : 'btn-outline-success bg-white'
            }`}
          >
            🔄 2. RETURN JOURNEY TO DROP POINT (Stages 1 – 4)
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: ONWARD JOURNEY TO NMACC (STAGES 1 - 7 IN EASY HINGLISH)
         ===================================================================== */}
      {journeyTab === 'onward' && (
        <div className="row g-4">
          {/* LEFT COLUMN: STAGES 1 TO 4 */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="fw-bold text-dark mb-0">
                  Onward Checkpoints (Origin Depot ➔ Pickup Point) — {currentBus.id}
                </h6>
              </div>
              <div className="card-body p-3 p-md-4">
                {/* STAGE 1 */}
                <div
                  className={getBoxClasses(Boolean(currentBus.stage1_reported))}
                  style={getBoxStyle(Boolean(currentBus.stage1_reported))}
                >
                  <div className="pe-2">
                    <div className="fw-bold text-dark">
                      1. Bus depot par pahunch gayi hai (Bus IC ne report kiya)
                    </div>
                    <div className="small text-muted">
                      {currentBus.depot || 'Anik Depot'} / Kurla Bus Depot (LBS Rd, Kurla 400070)
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <span className="badge bg-white text-dark border px-2 py-2 font-monospace">
                      {currentBus.stage1_time || '--:--'}
                    </span>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                      checked={Boolean(currentBus.stage1_reported)}
                      onChange={() => handleCheckboxToggle('stage1_reported', 'stage1_time', 'Stage 1 (Depot Pohoch Gaye)')}
                    />
                  </div>
                </div>

                {/* STAGE 2 */}
                <div
                  className={`p-3 rounded border mb-3 ${allSuppliesDone ? '' : 'bg-light'}`}
                  style={getBoxStyle(allSuppliesDone)}
                >
                  <div className="fw-bold text-dark mb-2">
                    2. Food packets, stickers aur First Aid Kit bus mein rakh diye gaye hain
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSupplyToggle('food_loaded', 'Food Packets')}
                      className={`btn btn-sm fw-semibold px-3 py-2 ${
                        currentBus.food_loaded ? 'btn-success text-white' : 'btn-outline-secondary bg-white text-dark'
                      }`}
                    >
                      {currentBus.food_loaded ? '✓ Food Packets Rakh Diya' : 'Food Packets'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSupplyToggle('sticker_pasted', 'Sticker Paste')}
                      className={`btn btn-sm fw-semibold px-3 py-2 ${
                        currentBus.sticker_pasted ? 'btn-success text-white' : 'btn-outline-secondary bg-white text-dark'
                      }`}
                    >
                      {currentBus.sticker_pasted ? '✓ Sticker Paste Ho Gaya' : 'Sticker Paste'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSupplyToggle('first_aid_loaded', 'First Aid Kit')}
                      className={`btn btn-sm fw-semibold px-3 py-2 ${
                        currentBus.first_aid_loaded ? 'btn-success text-white' : 'btn-outline-secondary bg-white text-dark'
                      }`}
                    >
                      {currentBus.first_aid_loaded ? '✓ First Aid Kit Rakh Diya' : 'First Aid Kit'}
                    </button>
                  </div>
                </div>

                {/* STAGE 3 */}
                <div
                  className={getBoxClasses(Boolean(currentBus.stage3_departed))}
                  style={getBoxStyle(Boolean(currentBus.stage3_departed))}
                >
                  <div className="pe-2">
                    <div className="fw-bold text-dark">
                      3. Bus depot se NGO pickup point ke liye nikal gayi hai
                    </div>
                    <div className="small text-muted">
                      Departed {currentBus.depot || 'Anik / Kurla Bus Depot'} towards NGO Pickup
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <span className="badge bg-white text-dark border px-2 py-2 font-monospace">
                      {currentBus.stage3_time || '--:--'}
                    </span>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                      checked={Boolean(currentBus.stage3_departed)}
                      onChange={() => handleCheckboxToggle('stage3_departed', 'stage3_time', 'Stage 3 (Depot Se Nikal Gayi)')}
                    />
                  </div>
                </div>

                {/* STAGE 4 */}
                <div
                  className={`p-3 rounded border d-flex justify-content-between align-items-center ${
                    currentBus.stage4_reached_pickup ? '' : 'bg-light'
                  }`}
                  style={getBoxStyle(Boolean(currentBus.stage4_reached_pickup))}
                >
                  <div className="pe-2">
                    <div className="fw-bold text-dark">
                      4. Bus NGO pickup point par pahunch gayi hai
                    </div>
                    <div className="small text-muted">
                      {currentBus.pickup_point || 'NGO Pickup Location'}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <span className="badge bg-white text-dark border px-2 py-2 font-monospace">
                      {currentBus.stage4_time || '--:--'}
                    </span>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                      checked={Boolean(currentBus.stage4_reached_pickup)}
                      onChange={() => handleCheckboxToggle('stage4_reached_pickup', 'stage4_time', 'Stage 4 (NGO Pickup Pohoch Gayi)')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: STAGES 5 TO 7 */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="fw-bold text-dark mb-0">
                  Onward Headcount & NMACC Arrival (Stages 5 – 7)
                </h6>
              </div>
              <div className="card-body p-3 p-md-4">
                {/* STAGE 5 */}
                <div
                  className={`p-3 rounded border mb-3 ${currentBus.stage5_boarded ? '' : 'bg-light'}`}
                  style={getBoxStyle(Boolean(currentBus.stage5_boarded))}
                >
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div className="fw-bold text-dark">
                      5. Bus mein kitne Boys, Girls aur NGO Volunteers hain? (Headcount)
                    </div>
                    <span className="badge bg-primary px-3 py-2">
                      Total: {String(onwardTotalPax).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <label className="form-label small fw-bold text-dark mb-1">Boys (Ladke)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="00"
                        className="form-control fw-bold text-center"
                        value={boysInput === 0 ? '' : boysInput}
                        onChange={(e) => handleHeadcountChange('boys', e.target.value)}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-bold text-dark mb-1">Girls (Ladkiyan)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="00"
                        className="form-control fw-bold text-center"
                        value={girlsInput === 0 ? '' : girlsInput}
                        onChange={(e) => handleHeadcountChange('girls', e.target.value)}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-bold text-dark mb-1">NGO Volunteers</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="00"
                        className="form-control fw-bold text-center"
                        value={nvInput === 0 ? '' : nvInput}
                        onChange={(e) => handleHeadcountChange('nv', e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmOnwardHeadcount}
                    className={`btn w-100 fw-bold py-2 ${
                      currentBus.stage5_boarded ? 'btn-success text-white' : 'btn-primary text-white'
                    }`}
                  >
                    {currentBus.stage5_boarded
                      ? '✓ Headcount Saved & Verified (Click to Overwrite)'
                      : 'Confirm & Verify Onward Headcount'}
                  </button>
                </div>

                {/* STAGE 6 */}
                <div
                  className={getBoxClasses(Boolean(currentBus.stage6_reached_nmacc))}
                  style={getBoxStyle(Boolean(currentBus.stage6_reached_nmacc))}
                >
                  <div className="pe-2">
                    <div className="fw-bold text-dark">
                      6. Bus NMACC (Jio World Centre) pahunch gayi hai
                    </div>
                    <div className="small text-muted">
                      Bus Reached Safely at NMACC / JWC Venue
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <span className="badge bg-white text-dark border px-2 py-2 font-monospace">
                      {currentBus.stage6_time || '--:--'}
                    </span>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                      checked={Boolean(currentBus.stage6_reached_nmacc)}
                      onChange={() => handleCheckboxToggle('stage6_reached_nmacc', 'stage6_time', 'Stage 6 (NMACC Pohoch Gayi)')}
                    />
                  </div>
                </div>

                {/* STAGE 7 */}
                <div
                  className={`p-3 rounded border d-flex justify-content-between align-items-center ${
                    currentBus.stage7_seated ? '' : 'bg-light'
                  }`}
                  style={getBoxStyle(Boolean(currentBus.stage7_seated))}
                >
                  <div className="pe-2">
                    <div className="fw-bold text-dark">
                      7. Sabhi bacche NMACC Theatre mein baith gaye hain
                    </div>
                    <div className="small text-muted">
                      All children & NGO volunteers safely escorted and seated inside theater
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <span className="badge bg-white text-dark border px-2 py-2 font-monospace">
                      {currentBus.stage7_time || '--:--'}
                    </span>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                      checked={Boolean(currentBus.stage7_seated)}
                      onChange={() => handleCheckboxToggle('stage7_seated', 'stage7_time', 'Stage 7 (Theater Mein Baith Gaye)')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: RETURN JOURNEY TO DROP POINT (STAGES 1 - 4 IN EASY HINGLISH)
         ===================================================================== */}
      {journeyTab === 'return' && (
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="fw-bold text-dark mb-0">
                  Return Journey Checkpoints (NMACC / JWC ➔ NGO Drop Point) — {currentBus.id}
                </h6>
              </div>
              <div className="card-body p-3 p-md-4">
                {/* RETURN STAGE 1: HEADCOUNT */}
                <div
                  className={`p-3 rounded border mb-3 ${
                    returnTotalPax > 0 ? '' : 'bg-light'
                  }`}
                  style={getBoxStyle(returnTotalPax > 0)}
                >
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div className="fw-bold text-dark">
                      1. Wapas jaane ke liye sabhi bachche aur volunteers bus mein baith gaye hain?
                    </div>
                    <span className="badge bg-success px-3 py-2">
                      Return Total: {String(returnTotalPax).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <label className="form-label small fw-bold text-dark mb-1">Boys (Ladke)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="00"
                        className="form-control fw-bold text-center"
                        value={retBoysInput === 0 ? '' : retBoysInput}
                        onChange={(e) => handleReturnHeadcountChange('boys', e.target.value)}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-bold text-dark mb-1">Girls (Ladkiyan)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="00"
                        className="form-control fw-bold text-center"
                        value={retGirlsInput === 0 ? '' : retGirlsInput}
                        onChange={(e) => handleReturnHeadcountChange('girls', e.target.value)}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-bold text-dark mb-1">NGO Volunteers</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="00"
                        className="form-control fw-bold text-center"
                        value={retNvInput === 0 ? '' : retNvInput}
                        onChange={(e) => handleReturnHeadcountChange('nv', e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmReturnHeadcount}
                    className="btn btn-success w-100 fw-bold py-2 text-white"
                  >
                    ✓ Confirm & Save Return Headcount
                  </button>
                </div>

                {/* RETURN STAGE 2: DEPARTED JWC */}
                <div
                  className={getBoxClasses(Boolean(currentBus.return_departed))}
                  style={getBoxStyle(Boolean(currentBus.return_departed))}
                >
                  <div className="pe-2">
                    <div className="fw-bold text-dark">
                      2. Show khatam! Bus NMACC (JWC) se wapas drop point ke liye nikal gayi hai
                    </div>
                    <div className="small text-muted">
                      Bus departed from NMACC / JWC towards NGO drop location
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <span className="badge bg-white text-dark border px-2 py-2 font-monospace">
                      {currentBus.return_departed_time || '--:--'}
                    </span>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                      checked={Boolean(currentBus.return_departed)}
                      onChange={() => handleCheckboxToggle('return_departed', 'return_departed_time', 'Return Stage 2 (JWC Se Nikal Gayi)')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="fw-bold text-dark mb-0">
                  Safe Drop & Undertaking Verification (Stages 3 – 4)
                </h6>
              </div>
              <div className="card-body p-3 p-md-4">
                {/* RETURN STAGE 3: REACHED DROP POINT */}
                <div
                  className={getBoxClasses(Boolean(currentBus.return_reached_drop))}
                  style={getBoxStyle(Boolean(currentBus.return_reached_drop))}
                >
                  <div className="pe-2">
                    <div className="fw-bold text-dark">
                      3. Bus wapas NGO drop point par safe pahunch gayi hai
                    </div>
                    <div className="small text-muted">
                      Drop Location: {currentBus.pickup_point || 'Respective NGO Drop Point'}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <span className="badge bg-white text-dark border px-2 py-2 font-monospace">
                      {currentBus.return_drop_time || '--:--'}
                    </span>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                      checked={Boolean(currentBus.return_reached_drop)}
                      onChange={() => handleCheckboxToggle('return_reached_drop', 'return_drop_time', 'Return Stage 3 (Drop Point Pohoch Gayi)')}
                    />
                  </div>
                </div>

                {/* RETURN STAGE 4: UNDERTAKING & FEEDBACK */}
                <div
                  className={`p-3 rounded border d-flex justify-content-between align-items-center ${
                    currentBus.ngo_undertaking_signed ? '' : 'bg-light'
                  }`}
                  style={getBoxStyle(Boolean(currentBus.ngo_undertaking_signed))}
                >
                  <div className="pe-2">
                    <div className="fw-bold text-dark">
                      4. Sabhi bacche safe utar gaye hain aur NGO POC se handover sign le liya hai
                    </div>
                    <div className="small text-muted">
                      NGO Undertaking & Feedback Signed and Handover Completed
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <span className="badge bg-white text-dark border px-2 py-2">
                      {currentBus.ngo_undertaking_signed ? 'Signed ✓' : 'Pending'}
                    </span>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                      checked={Boolean(currentBus.ngo_undertaking_signed)}
                      onChange={() => handleCheckboxToggle('ngo_undertaking_signed', null, 'Return Stage 4 (Undertaking Taken)')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
