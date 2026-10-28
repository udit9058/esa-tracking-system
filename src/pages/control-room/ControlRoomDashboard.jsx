import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Bus, Download, RefreshCw, Trash2, Phone, 
  CheckCircle2, Edit3
} from 'lucide-react';
import * as masterData from '../../utils/masterLogisticData';
import { supabase } from '../../lib/supabaseClient';
import {
  GATE_NAMES,
  fetchGateTrafficData,
  getLocalGateTrafficData,
  saveGateTrafficCells,
  saveLocalGateTrafficData
} from '../../lib/gateTraffic';
import { readBusTelemetry, saveBusTelemetry } from '../../lib/busSync';
import { normalizeBusTelemetry } from '../../lib/busTelemetry';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_GYM_FLEET = [
  { id: 'Gym Bus 1', busNumber: 1, location: 'Nasik', routeLabel: 'Nasik - Bus 1', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 2', busNumber: 2, location: 'Nasik', routeLabel: 'Nasik - Bus 2', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 3', busNumber: 3, location: 'Pune', routeLabel: 'Pune - Bus 1', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 4', busNumber: 4, location: 'Pune', routeLabel: 'Pune - Bus 2', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 5', busNumber: 5, location: 'Pune', routeLabel: 'Pune - Bus 3', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 6', busNumber: 6, location: 'Pune', routeLabel: 'Pune - Bus 4', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 7', busNumber: 7, location: 'Lonavala', routeLabel: 'Lonavala - Bus 1', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 8', busNumber: 8, location: 'Mumbai/Thane', routeLabel: 'Mumbai/Thane - Bus 1', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 9', busNumber: 9, location: 'Mumbai/Thane', routeLabel: 'Mumbai/Thane - Bus 2', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 10', busNumber: 10, location: 'Mumbai/Thane', routeLabel: 'Mumbai/Thane - Bus 3', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 11', busNumber: 11, location: 'Mumbai/Thane', routeLabel: 'Mumbai/Thane - Bus 4', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 12', busNumber: 12, location: 'Mumbai/Thane', routeLabel: 'Mumbai/Thane - Bus 5', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 13', busNumber: 13, location: 'Mumbai/Thane', routeLabel: 'Mumbai/Thane - Bus 6', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' },
  { id: 'Gym Bus 14', busNumber: 14, location: 'Mumbai/Thane', routeLabel: 'Mumbai/Thane - Bus 7 (Reserve)', started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' }
];

const FALLBACK_SLOTS = [
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30',
  '23:00', '23:30', '00:00'
];

// Guarantee every bus has a unique numeric bus_number (1 to 10) so clicking one checkbox NEVER selects the whole column
function normalizeFleet(rawFleet) {
  const list = Array.isArray(rawFleet) && rawFleet.length > 0 ? rawFleet : (masterData.INITIAL_BUS_FLEET || []);
  return list.map(normalizeBusTelemetry);
}

export default function ControlRoomDashboard() {
  const { profile } = useAuth();
  const busSyncToken = profile?.bus_sync_token;
  const timeSlots = masterData.GATE_TIME_SLOTS || FALLBACK_SLOTS;

  // Prevent background polling from overwriting user edits while typing
  const lastLocalEditTimeRef = useRef(0);
  const gateSaveTimerRef = useRef(null);
  const gateSaveQueueRef = useRef(Promise.resolve());
  const pendingGateChangesRef = useRef(new Map());
  const pendingGateSaveRef = useRef(false);
  const gateChangeVersionRef = useRef(0);
  const gateFetchInFlightRef = useRef(false);

  const safeGetFleet = () => {
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

  const safeGetUsers = () => (masterData.getProvisionedUsers ? masterData.getProvisionedUsers() : (masterData.INITIAL_ROSTER_USERS || []));

  const safeGetGym = () => {
    try {
      const s = localStorage.getItem('esa_alina_2026_gymnastic_v1');
      if (s) return JSON.parse(s);
    } catch (e) {}
    return DEFAULT_GYM_FLEET;
  };

  const [fleet, setFleet] = useState(safeGetFleet);
  const [gymFleet, setGymFleet] = useState(safeGetGym);
  const [users, setUsers] = useState(safeGetUsers);
  const [trafficData, setTrafficData] = useState(() => getLocalGateTrafficData(timeSlots));
  const [editingBus, setEditingBus] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');
  const [busSyncError, setBusSyncError] = useState('');
  const [trafficLoading, setTrafficLoading] = useState(true);

  // SPA Form State for Gymnastic Childrens Tracking
  const [selectedGymBusId, setSelectedGymBusId] = useState('Gym Bus 1');
  const [gymActionStage, setGymActionStage] = useState('started');

  const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Save Bus Fleet immediately to all local keys.
  const saveFleetEverywhere = (updatedFleet) => {
    lastLocalEditTimeRef.current = Date.now();
    const cleanFleet = normalizeFleet(updatedFleet);
    setFleet(cleanFleet);
    const jsonStr = JSON.stringify(cleanFleet);
    localStorage.setItem('esa_alina_2026_fleet_v1', jsonStr);
    localStorage.setItem('esa_alina_2026_fleet_v2', jsonStr);
    if (masterData.saveLiveFleet) {
      masterData.saveLiveFleet(cleanFleet);
    }
  };

  // Keep the draft locally; writes to Supabase are debounced from the input handler.
  const saveGateEverywhere = (updatedTraffic) => {
    lastLocalEditTimeRef.current = Date.now();
    setTrafficData(updatedTraffic);
    saveLocalGateTrafficData(updatedTraffic);
  };

  const persistBusTelemetry = async (busNumber, changes) => {
    try {
      if (!busSyncToken) {
        throw new Error('Your secure sync session is missing. Sign out and sign in again.');
      }
      await saveBusTelemetry(busSyncToken, busNumber, changes);
      setBusSyncError('');
      return true;
    } catch (error) {
      console.error('Unable to save control-room bus telemetry:', error);
      setBusSyncError(`Could not save bus telemetry to Supabase: ${error.message}`);
      return false;
    }
  };

  const queueGateSave = (save) => {
    const queuedSave = gateSaveQueueRef.current.then(save);
    gateSaveQueueRef.current = queuedSave
      .then(() => {
        setSyncError('');
        return true;
      })
      .catch((error) => {
        console.error('Gate count sync failed:', error);
        setSyncMessage('');
        setSyncError(error.message);
        return false;
      });
    return gateSaveQueueRef.current;
  };

  const flushPendingGateChanges = async () => {
    if (pendingGateChangesRef.current.size === 0) return true;

    const changes = Array.from(pendingGateChangesRef.current.values());
    const version = gateChangeVersionRef.current;
    const saved = await queueGateSave(() => saveGateTrafficCells(changes));

    if (saved) {
      for (const change of changes) {
        const key = `${change.gateName}:${change.timeSlot}`;
        if (pendingGateChangesRef.current.get(key) === change) {
          pendingGateChangesRef.current.delete(key);
        }
      }
      if (version === gateChangeVersionRef.current && pendingGateChangesRef.current.size === 0) {
        pendingGateSaveRef.current = false;
      }
    }

    return saved;
  };

  const saveGymEverywhere = (updatedGym) => {
    lastLocalEditTimeRef.current = Date.now();
    setGymFleet(updatedGym);
    localStorage.setItem('esa_alina_2026_gymnastic_v1', JSON.stringify(updatedGym));
    if (masterData.saveGymnasticFleet) {
      masterData.saveGymnasticFleet(updatedGym);
    }
  };

  const fetchAllLiveTelemetry = async (force = false) => {
    if (pendingGateSaveRef.current) {
      if (!gateSaveTimerRef.current) await flushPendingGateChanges();
      return false;
    }

    // Do not overwrite screen if user edited a checkbox or gate input in the last 6 seconds
    if (!force && Date.now() - lastLocalEditTimeRef.current < 6000) {
      return false;
    }
    let gateTrafficSynced = false;
    const gateVersionAtFetchStart = gateChangeVersionRef.current;
    if (!busSyncToken) {
      setFleet(safeGetFleet());
      setGymFleet(safeGetGym());
      setBusSyncError(profile?.bus_sync_warning ? '' : 'Secure bus sync session is missing. Sign out and sign in again.');
    } else {
      try {
        const currentLocal = safeGetFleet();
        const telemetryRows = await readBusTelemetry(busSyncToken);
        const mergedFleet = currentLocal.map((localBus) => {
          const busNumber = Number(localBus.bus_number);
          const telemetry = telemetryRows.find((row) => Number(row.bus_number) === busNumber);
          return telemetry ? normalizeBusTelemetry({ ...localBus, ...telemetry }) : localBus;
        });
        const jsonStr = JSON.stringify(mergedFleet);
        localStorage.setItem('esa_alina_2026_fleet_v1', jsonStr);
        localStorage.setItem('esa_alina_2026_fleet_v2', jsonStr);
        setFleet(mergedFleet);
        setGymFleet(safeGetGym());
        setBusSyncError('');
      } catch (error) {
        console.error('Unable to refresh control-room bus telemetry:', error);
        setBusSyncError(`Could not load bus telemetry from Supabase: ${error.message}`);
        setFleet(safeGetFleet());
        setGymFleet(safeGetGym());
      }
    }

    if (supabase && !gateFetchInFlightRef.current) {
      gateFetchInFlightRef.current = true;
      try {
        const latestTraffic = await fetchGateTrafficData();
        if (
          !pendingGateSaveRef.current &&
          gateVersionAtFetchStart === gateChangeVersionRef.current
        ) {
          setTrafficData(latestTraffic);
          saveLocalGateTrafficData(latestTraffic);
          setSyncError('');
          gateTrafficSynced = true;
        }
      } catch (error) {
        console.error('Unable to refresh gate counts from Supabase:', error);
        setSyncMessage('');
        setSyncError(error.message);
      } finally {
        gateFetchInFlightRef.current = false;
      }
    } else if (!supabase) {
      setSyncError('Supabase is not configured. Gate counts are only available on this device.');
    }
    setTrafficLoading(false);
    return gateTrafficSynced;
  };

  useEffect(() => {
    fetchAllLiveTelemetry(true);
    const handleStorage = () => {
        if (pendingGateSaveRef.current || Date.now() - lastLocalEditTimeRef.current < 2000) return;
      setFleet(safeGetFleet());
      setGymFleet(safeGetGym());
      setTrafficData(getLocalGateTrafficData(timeSlots));
    };
    window.addEventListener('storage', handleStorage);

    const interval = setInterval(() => {
      fetchAllLiveTelemetry(false);
    }, 4000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
      if (gateSaveTimerRef.current) {
        clearTimeout(gateSaveTimerRef.current);
        gateSaveTimerRef.current = null;
        flushPendingGateChanges();
      }
    };
  }, []);

  const handleManualSync = async () => {
    const gateTrafficSynced = await fetchAllLiveTelemetry(true);
    if (gateTrafficSynced) {
      setSyncMessage('Synced latest gate traffic counts!');
      setTimeout(() => setSyncMessage(''), 2500);
    }
  };

  // Toggle ONLY the clicked bus row & column cell (auto-saves immediately)
  const handleToggleBusStage = async (targetBusNumber, boolField, timeField) => {
    const nextTime = nowTime();
    let newFieldVal = false;

    const updated = fleet.map((item, idx) => {
      const itemNum = Number(item.bus_number || item.busNumber || idx + 1);
      if (itemNum === Number(targetBusNumber)) {
        newFieldVal = !item[boolField];
        const changes = { [boolField]: newFieldVal };
        if (timeField) {
          changes[timeField] = newFieldVal ? nextTime : '';
        }
        return { ...item, ...changes };
      }
      return item;
    });

    saveFleetEverywhere(updated);
    await persistBusTelemetry(targetBusNumber, {
      [boolField]: newFieldVal,
      ...(timeField ? { [timeField]: newFieldVal ? nextTime : '' } : {})
    });
  };

  const handleToggleSupplies = async (targetBusNumber) => {
    let changes = null;
    const updated = fleet.map((item, idx) => {
      const itemNum = Number(item.bus_number || item.busNumber || idx + 1);
      if (itemNum === Number(targetBusNumber)) {
        const allLoaded = item.food_loaded && item.sticker_pasted && item.first_aid_loaded;
        const nextState = !allLoaded;
        changes = { food_loaded: nextState, sticker_pasted: nextState, first_aid_loaded: nextState };
        return { ...item, ...changes };
      }
      return item;
    });
    saveFleetEverywhere(updated);
    if (changes) await persistBusTelemetry(targetBusNumber, changes);
  };

  const handleUpdateBusCounts = async (targetBusNumber, field, val) => {
    const numVal = Math.max(0, Number(val) || 0);
    const updated = fleet.map((item, idx) => {
      const itemNum = Number(item.bus_number || item.busNumber || idx + 1);
      if (itemNum === Number(targetBusNumber)) {
        return { ...item, [field]: numVal, stage5_boarded: true };
      }
      return item;
    });
    saveFleetEverywhere(updated);
    if (editingBus && Number(editingBus.bus_number) === Number(targetBusNumber)) {
      setEditingBus({ ...editingBus, [field]: numVal });
    }
    await persistBusTelemetry(targetBusNumber, { [field]: numVal, stage5_boarded: true });
  };

  // Dedicated Reset Button to delete/clear all Bus IC data back to 00
  const handleResetBusICData = async () => {
    if (window.confirm('Reset all 10 Bus IC Onward & Return journey checkboxes, times, and passenger counts back to 00?')) {
      const resetChanges = {
        onboard_boys: 0,
        onboard_girls: 0,
        onboard_ngo: 0,
        return_boys: 0,
        return_girls: 0,
        return_ngo: 0,
        stage1_reported: false,
        stage1_time: '',
        food_loaded: false,
        sticker_pasted: false,
        first_aid_loaded: false,
        supplies_issue_reason: '',
        stage3_departed: false,
        stage3_time: '',
        stage4_reached_pickup: false,
        stage4_time: '',
        stage5_boarded: false,
        stage6_reached_nmacc: false,
        stage6_time: '',
        stage7_seated: false,
        stage7_time: '',
        return_departed: false,
        return_departed_time: '',
        return_headcount_verified: false,
        return_headcount_time: '',
        return_reached_drop: false,
        return_drop_time: '',
        ngo_undertaking_signed: false,
        ngo_feedback_note: '',
        ngo_poc_signature: '',
        ngo_undertaking_time: ''
      };
      const resetFleet = fleet.map((b, idx) => {
        const bNum = Number(b.bus_number || idx + 1);
        return {
          ...b,
          bus_number: bNum,
          busNumber: bNum,
          id: `Bus #${bNum}`,
          ...resetChanges
        };
      });
      saveFleetEverywhere(resetFleet);
      const saved = await Promise.all(resetFleet.map((bus) =>
        persistBusTelemetry(bus.bus_number, resetChanges)
      ));
      if (saved.every(Boolean)) {
        setSyncMessage('All 10 Bus IC data reset and synced to Supabase!');
        setTimeout(() => setSyncMessage(''), 3000);
      } else {
        setSyncMessage('Reset on this device; one or more bus records failed to sync.');
      }
    }
  };

  const handleClearGateTraffic = () => {
    if (window.confirm('Clear all guest counts for Gates 11, 18, and 20 back to 0?')) {
      const emptyData = { 'Gate 11': {}, 'Gate 18': {}, 'Gate 20': {} };
      timeSlots.forEach(slot => {
        emptyData['Gate 11'][slot] = 0;
        emptyData['Gate 18'][slot] = 0;
        emptyData['Gate 20'][slot] = 0;
      });
      clearTimeout(gateSaveTimerRef.current);
      gateSaveTimerRef.current = null;
      pendingGateChangesRef.current.clear();
      for (const gateName of GATE_NAMES) {
        for (const slot of timeSlots) {
          pendingGateChangesRef.current.set(`${gateName}:${slot}`, {
            gateName,
            timeSlot: slot,
            guestCount: 0
          });
        }
      }
      pendingGateSaveRef.current = true;
      gateChangeVersionRef.current += 1;
      saveGateEverywhere(emptyData);
      flushPendingGateChanges().then((saved) => {
        if (saved) {
          setSyncMessage('All gate guest counts saved as zero.');
          setTimeout(() => setSyncMessage(''), 3000);
        }
      });
    }
  };

  // Overwrite same gate & time slot immediately and auto-save so data never vanishes
  const handleGateInputChange = (gateName, slot, rawValue) => {
    const cleanNum = rawValue === '' ? 0 : Math.max(0, parseInt(rawValue, 10) || 0);
    const updated = {
      ...trafficData,
      [gateName]: {
        ...(trafficData[gateName] || {}),
        [slot]: cleanNum
      }
    };
    saveGateEverywhere(updated);
    pendingGateChangesRef.current.set(`${gateName}:${slot}`, {
      gateName,
      timeSlot: slot,
      guestCount: cleanNum
    });
    pendingGateSaveRef.current = true;
    gateChangeVersionRef.current += 1;
    clearTimeout(gateSaveTimerRef.current);
    gateSaveTimerRef.current = setTimeout(() => {
      gateSaveTimerRef.current = null;
      flushPendingGateChanges();
    }, 500);
  };

  const exportMasterCSV = () => {
    const headers = "Bus,Depot,NGO,Pickup,BusIC,Phone,ReportedOrigin,DepartedDepot,ReachedPickup,Boys,Girls,NV,TotalPax,ReachedNMACC,SeatedTheater,ReturnDepartedJWC,ReachedDropPoint,UndertakingSigned\n";
    const rows = fleet.map((b, idx) => {
      const bNum = b.bus_number || idx + 1;
      const boys = Number(b.onboard_boys || 0);
      const girls = Number(b.onboard_girls || 0);
      const nv = Number(b.onboard_ngo || 0);
      return `"Bus #${bNum}","${b.depot || b.origin_depot}","${b.ngo_name || b.ngo}","${b.pickup_point || ''}","${b.bus_ic_name || b.icName}","${b.bus_ic_phone || b.icPhone}","${b.stage1_time || 'No'}","${b.stage3_time || 'No'}","${b.stage4_time || 'No'}",${boys},${girls},${nv},${boys+girls+nv},"${b.stage6_time || 'No'}","${b.stage7_time || 'No'}","${b.return_departed_time || 'No'}","${b.return_drop_time || 'No'}","${b.ngo_undertaking_signed ? 'Yes' : 'No'}"`;
    }).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows));
    link.setAttribute("download", "ESA_Alina_2026_Master_Control_Room_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // 1. ONWARD TRIP DYNAMIC SUMMARY CALCULATIONS
  // =========================================================================
  const totalBuses = 10;
  const reportedOriginCount = fleet.filter(b => b.stage1_reported).length;
  const suppliesLoadedCount = fleet.filter(b => b.food_loaded && b.sticker_pasted && b.first_aid_loaded).length;
  const startedFromDepot = fleet.filter(b => b.stage3_departed).length;
  const reachedPickupPoint = fleet.filter(b => b.stage4_reached_pickup).length;

  const totalBoys = fleet.reduce((sum, b) => sum + Number(b.onboard_boys || 0), 0);
  const totalGirls = fleet.reduce((sum, b) => sum + Number(b.onboard_girls || 0), 0);
  const totalNV = fleet.reduce((sum, b) => sum + Number(b.onboard_ngo || 0), 0);
  const totalChildrenAndNV = totalBoys + totalGirls + totalNV;

  const reachedJwcNmacc = fleet.filter(b => b.stage6_reached_nmacc).length;
  const seatedTheaterCount = fleet.filter(b => b.stage7_seated).length;

  // =========================================================================
  // 2. RETURN TRIP DYNAMIC SUMMARY CALCULATIONS
  // =========================================================================
  const startedFromJwc = fleet.filter(b => b.return_departed).length;
  const reachedDropPoint = fleet.filter(b => b.return_reached_drop).length;
  const undertakingTaken = fleet.filter(b => b.ngo_undertaking_signed).length;

  // =========================================================================
  // 3. GYMNASTIC CHILDRENS TRACKING (14 BUSES) CALCULATIONS
  // =========================================================================
  const gymTotal = gymFleet.length;
  const gymStarted = gymFleet.filter(g => g.started).length;
  const gymNotStarted = gymTotal - gymStarted;
  const gymReachedJwc = gymFleet.filter(g => g.reachedJwc).length;
  const gymDepartedRespective = gymFleet.filter(g => g.departedRespective).length;
  const gymReachedRespective = gymFleet.filter(g => g.reachedRespective).length;

  const formatTwoDigits = (n) => String(n).padStart(2, '0');

  const handleGymTick = (busId, field, timeField) => {
    const updated = gymFleet.map(g => {
      if (g.id === busId) {
        const nextVal = !g[field];
        const nextTime = nextVal ? nowTime() : '';
        const extra = (field === 'reachedJwc' && nextVal && !g.started) ? { started: true, startedTime: g.startedTime || nowTime() } : {};
        return { ...g, [field]: nextVal, [timeField]: nextTime, ...extra };
      }
      return g;
    });
    saveGymEverywhere(updated);
  };

  const handleGymSpaSubmit = (e) => {
    e.preventDefault();
    const stamp = nowTime();
    const updated = gymFleet.map(g => {
      if (g.id === selectedGymBusId) {
        if (gymActionStage === 'started') return { ...g, started: true, startedTime: stamp };
        if (gymActionStage === 'reachedJwc') return { ...g, started: true, startedTime: g.startedTime || stamp, reachedJwc: true, reachedJwcTime: stamp };
        if (gymActionStage === 'departedRespective') return { ...g, departedRespective: true, departedRespectiveTime: stamp };
        if (gymActionStage === 'reachedRespective') return { ...g, reachedRespective: true, reachedRespectiveTime: stamp };
        if (gymActionStage === 'reset') return { ...g, started: false, startedTime: '', reachedJwc: false, reachedJwcTime: '', departedRespective: false, departedRespectiveTime: '', reachedRespective: false, reachedRespectiveTime: '' };
      }
      return g;
    });
    saveGymEverywhere(updated);
    setSyncMessage(`${selectedGymBusId} saved with time (${stamp})!`);
    setTimeout(() => setSyncMessage(''), 2500);
  };

  // Gate Totals
  const total11 = Object.values(trafficData['Gate 11'] || {}).reduce((a, b) => a + Number(b || 0), 0);
  const total18 = Object.values(trafficData['Gate 18'] || {}).reduce((a, b) => a + Number(b || 0), 0);
  const total20 = Object.values(trafficData['Gate 20'] || {}).reduce((a, b) => a + Number(b || 0), 0);
  const grandTotalGuests = total11 + total18 + total20;

  const purpleCardStyle = {
    backgroundColor: '#23074d',
    borderRadius: '18px',
    padding: '20px 18px',
    color: '#ffffff',
    minHeight: '128px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    boxShadow: '0 6px 16px rgba(35, 7, 77, 0.18)',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  };

  const labelStyle = {
    fontSize: '0.76rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#cbd5e1',
    fontWeight: 600,
    marginBottom: '6px'
  };

  const valueStyle = {
    fontSize: '2rem',
    fontWeight: 800,
    lineHeight: 1.1,
    color: '#ffffff'
  };

  const subValueStyle = {
    fontSize: '0.8rem',
    color: '#e2e8f0',
    marginTop: '6px',
    fontWeight: 500
  };

  return (
    <div className="container-fluid py-3 px-2 px-md-4" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      {syncMessage && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 mb-3 shadow-sm">
          <CheckCircle2 size={18} />
          <span className="fw-semibold small">{syncMessage}</span>
        </div>
      )}
      {syncError && <div className="alert alert-danger py-2 mb-3 shadow-sm">{syncError}</div>}
      {profile?.bus_sync_warning && (
        <div className="alert alert-warning py-2 mb-3 shadow-sm">
          Signed in, but bus cloud sync is unavailable. Journey data will remain on this device until the Supabase Edge Function is deployed.
        </div>
      )}
      {busSyncError && <div className="alert alert-danger py-2 mb-3 shadow-sm">{busSyncError}</div>}

      {/* =====================================================================
          DIVISION 1: ONWARD TRIP SUMMARY (5 DEEP-PURPLE CARDS)
         ===================================================================== */}
      <div className="mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <span
            className="badge rounded-pill px-3 py-2 fw-bold text-white shadow-sm"
            style={{ backgroundColor: '#23074d', fontSize: '0.84rem', letterSpacing: '0.04em' }}
          >
            1. ONWARD TRIP SUMMARY (DEPOT ➔ PICKUP POINT ➔ JWC / NMACC)
          </span>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              onClick={exportMasterCSV}
              className="btn btn-success btn-sm fw-bold px-3 py-1 d-inline-flex align-items-center gap-1 shadow-sm"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleResetBusICData}
              className="btn btn-danger btn-sm fw-bold px-3 py-1 d-inline-flex align-items-center gap-1 shadow-sm"
            >
              <Trash2 size={14} />
              <span>Reset All Bus IC Data</span>
            </button>
            <button
              onClick={handleManualSync}
              className="btn btn-outline-dark btn-sm fw-bold px-3 py-1 d-inline-flex align-items-center gap-1 bg-white shadow-sm"
            >
              <RefreshCw size={14} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-6 col-md-4 col-lg">
            <div style={purpleCardStyle}>
              <div style={labelStyle}>TOTAL BUSES</div>
              <div style={valueStyle}>{totalBuses}</div>
              <div style={subValueStyle}>Static Registered Fleet</div>
            </div>
          </div>

          <div className="col-6 col-md-4 col-lg">
            <div style={purpleCardStyle}>
              <div style={labelStyle}>STARTED FROM DEPOT</div>
              <div style={valueStyle}>{startedFromDepot} / {totalBuses}</div>
              <div style={subValueStyle}>Departed from Depots</div>
            </div>
          </div>

          <div className="col-6 col-md-4 col-lg">
            <div style={purpleCardStyle}>
              <div style={labelStyle}>REACHED PICKUP POINT</div>
              <div style={valueStyle}>{reachedPickupPoint} / {totalBuses}</div>
              <div style={subValueStyle}>Reported at Pickup Points</div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg">
            <div style={purpleCardStyle}>
              <div style={labelStyle}>CHILDREN COUNT (B | G | NV)</div>
              <div style={valueStyle}>{totalChildrenAndNV}</div>
              <div style={subValueStyle}>
                B: <strong>{totalBoys}</strong> | G: <strong>{totalGirls}</strong> | NV: <strong>{totalNV}</strong>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg">
            <div style={purpleCardStyle}>
              <div style={labelStyle}>REACHED AT JWC / NMACC</div>
              <div style={valueStyle}>{reachedJwcNmacc} / {totalBuses}</div>
              <div style={subValueStyle}>Arrived at JWC / NMACC</div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          DIVISION 2: RETURN TRIP SUMMARY (3 DEEP-PURPLE CARDS)
         ===================================================================== */}
      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-3">
          <span
            className="badge rounded-pill px-3 py-2 fw-bold text-white shadow-sm"
            style={{ backgroundColor: '#23074d', fontSize: '0.84rem', letterSpacing: '0.04em' }}
          >
            2. RETURN TRIP SUMMARY (JWC / NMACC ➔ DROP POINT & UNDERTAKING)
          </span>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div style={purpleCardStyle}>
              <div style={labelStyle}>BUSES STARTED FROM JWC</div>
              <div style={valueStyle}>{startedFromJwc} / {totalBuses}</div>
              <div style={subValueStyle}>Departed JWC for Return</div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div style={purpleCardStyle}>
              <div style={labelStyle}>BUSES REACHED AT DROP POINT</div>
              <div style={valueStyle}>{reachedDropPoint} / {totalBuses}</div>
              <div style={subValueStyle}>Reached Respective Drop Point</div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div style={purpleCardStyle}>
              <div style={labelStyle}>FEEDBACK & UNDERTAKING TAKEN</div>
              <div style={valueStyle}>{undertakingTaken} / {totalBuses}</div>
              <div style={subValueStyle}>Feedback & Undertaking Collected</div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 3: ONWARD JOURNEY LIVE TRACKING TABLE (STAGES 1 TO 7)
         ===================================================================== */}
      <div id="onward-tracking-section" className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
        <div className="card-header bg-primary text-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h6 className="fw-bold mb-0">
            ✈️ ONWARD JOURNEY LIVE TRACKING (Stages 1 to 7 — Origin / Kurla Depot ➔ Pickup ➔ JWC / NMACC)
          </h6>
          <div className="d-flex align-items-center gap-2">
            <button
              onClick={handleResetBusICData}
              className="btn btn-danger btn-sm fw-bold px-3 py-1 d-inline-flex align-items-center gap-1 shadow-sm"
            >
              <Trash2 size={14} />
              <span>Reset Bus IC Data</span>
            </button>
            <span className="badge bg-white text-primary fw-bold px-3 py-2">
              Click any single checkbox to toggle & auto-save
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle mb-0 text-center">
              <thead className="table-light text-uppercase small fw-bold">
                <tr>
                  <th className="text-start ps-3 py-3">BUS & DEPOT</th>
                  <th className="text-start">NGO & PICKUP POINT</th>
                  <th className="text-start">BUS IC & NGO POC</th>
                  <th>1. REPORTED ORIGIN ({reportedOriginCount}/10)</th>
                  <th>2. FOOD, STICKER, 1ST AID ({suppliesLoadedCount}/10)</th>
                  <th>3. STARTED FROM DEPOT ({startedFromDepot}/10)</th>
                  <th>4. REACHED PICKUP ({reachedPickupPoint}/10)</th>
                  <th>5. CHILDREN COUNT (B / G / NV)</th>
                  <th>6. REACHED JWC / NMACC ({reachedJwcNmacc}/10)</th>
                  <th>7. SEATED THEATER ({seatedTheaterCount}/10)</th>
                  <th>EDIT</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map((bus, index) => {
                  const bNum = Number(bus.bus_number || bus.busNumber || index + 1);
                  const boys = Number(bus.onboard_boys || 0);
                  const girls = Number(bus.onboard_girls || 0);
                  const nv = Number(bus.onboard_ngo || 0);
                  const rowTotal = boys + girls + nv;
                  const allSup = bus.food_loaded && bus.sticker_pasted && bus.first_aid_loaded;

                  return (
                    <tr key={`onward-bus-${bNum}`}>
                      <td className="text-start ps-3">
                        <div className="fw-bold text-primary">Bus #{bNum}</div>
                        <span className="badge bg-secondary bg-opacity-10 text-dark border small">
                          {bus.origin_depot || bus.depot || (bNum <= 6 ? 'Anik' : 'Shivaji Nagar')}
                        </span>
                      </td>
                      <td className="text-start">
                        <div className="fw-bold text-dark">{bus.ngo_name || bus.ngo}</div>
                        <div className="small text-muted">📍 {bus.pickup_point}</div>
                      </td>
                      <td className="text-start">
                        <div className="fw-bold text-dark">{bus.bus_ic_name || bus.icName}</div>
                        <div className="small text-success fw-semibold">📞 {bus.bus_ic_phone || bus.icPhone}</div>
                        {bus.ngo_poc && <div className="small text-muted">POC: {bus.ngo_poc}</div>}
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          checked={Boolean(bus.stage1_reported)}
                          onChange={() => handleToggleBusStage(bNum, 'stage1_reported', 'stage1_time')}
                        />
                        <div className="small text-muted font-monospace mt-1">{bus.stage1_time || '--:--'}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleSupplies(bNum)}
                          className={`btn btn-sm py-0 px-2 fw-bold ${allSup ? 'btn-success' : 'btn-warning text-dark'}`}
                        >
                          {allSup ? 'Loaded ✓' : 'Pending'}
                        </button>
                        <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                          F:{bus.food_loaded ? '✓' : '✗'} S:{bus.sticker_pasted ? '✓' : '✗'} M:{bus.first_aid_loaded ? '✓' : '✗'}
                        </div>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          checked={Boolean(bus.stage3_departed)}
                          onChange={() => handleToggleBusStage(bNum, 'stage3_departed', 'stage3_time')}
                        />
                        <div className="small text-muted font-monospace mt-1">{bus.stage3_time || '--:--'}</div>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          checked={Boolean(bus.stage4_reached_pickup)}
                          onChange={() => handleToggleBusStage(bNum, 'stage4_reached_pickup', 'stage4_time')}
                        />
                        <div className="small text-muted font-monospace mt-1">{bus.stage4_time || '--:--'}</div>
                      </td>
                      <td>
                        <div className="fw-bold text-dark small">
                          B:{formatTwoDigits(boys)} | G:{formatTwoDigits(girls)} | NV:{formatTwoDigits(nv)}
                        </div>
                        <span className="badge bg-light text-dark border mt-1">
                          Total: {formatTwoDigits(rowTotal)}
                        </span>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          checked={Boolean(bus.stage6_reached_nmacc)}
                          onChange={() => handleToggleBusStage(bNum, 'stage6_reached_nmacc', 'stage6_time')}
                        />
                        <div className="small text-muted font-monospace mt-1">{bus.stage6_time || '--:--'}</div>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          checked={Boolean(bus.stage7_seated)}
                          onChange={() => handleToggleBusStage(bNum, 'stage7_seated', 'stage7_time')}
                        />
                        <div className="small text-muted font-monospace mt-1">{bus.stage7_time || '--:--'}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setEditingBus({ ...bus, bus_number: bNum })}
                          className="btn btn-outline-primary btn-sm p-1 px-2"
                          title="Edit Counts"
                        >
                          <Edit3 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 4: RETURN JOURNEY LIVE TRACKING TABLE (JWC ➔ DROP & UNDERTAKING)
         ===================================================================== */}
      <div className="card border-0 shadow-sm rounded-3 mb-5 overflow-hidden">
        <div className="card-header bg-success text-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h6 className="fw-bold mb-0">
            🔄 RETURN JOURNEY LIVE TRACKING (JWC / NMACC ➔ NGO Drop Point & Feedback / Undertaking)
          </h6>
          <span className="badge bg-white text-success fw-bold px-3 py-1">
            Live Return Telemetry & Signed Undertaking Status
          </span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle mb-0 text-center">
              <thead className="table-light text-uppercase small fw-bold">
                <tr>
                  <th className="text-start ps-3 py-3">BUS & NGO</th>
                  <th className="text-start">DROP LOCATION & BUS IC</th>
                  <th>1. BUS STARTED FROM JWC ({startedFromJwc}/10)</th>
                  <th>2. RETURN CHILDREN COUNT (B / G / NV)</th>
                  <th>3. BUS REACHED AT DROP POINT ({reachedDropPoint}/10)</th>
                  <th>4. FEEDBACK & UNDERTAKING TAKEN ({undertakingTaken}/10)</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map((bus, index) => {
                  const bNum = Number(bus.bus_number || bus.busNumber || index + 1);
                  const boys = Number(bus.onboard_boys || 0);
                  const girls = Number(bus.onboard_girls || 0);
                  const nv = Number(bus.onboard_ngo || 0);
                  const rowTotal = boys + girls + nv;

                  return (
                    <tr key={`return-bus-${bNum}`}>
                      <td className="text-start ps-3">
                        <div className="fw-bold text-success">Bus #{bNum}</div>
                        <div className="small fw-semibold text-dark">{bus.ngo_name || bus.ngo}</div>
                      </td>
                      <td className="text-start">
                        <div className="small text-dark fw-semibold">📍 {bus.pickup_point}</div>
                        <div className="small text-muted">IC: {bus.bus_ic_name || bus.icName} ({bus.bus_ic_phone || bus.icPhone})</div>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          checked={Boolean(bus.return_departed)}
                          onChange={() => handleToggleBusStage(bNum, 'return_departed', 'return_departed_time')}
                        />
                        <div className="small text-muted font-monospace mt-1">{bus.return_departed_time || '--:--'}</div>
                      </td>
                      <td>
                        <div className="fw-bold text-dark small">
                          B:{formatTwoDigits(boys)} | G:{formatTwoDigits(girls)} | NV:{formatTwoDigits(nv)}
                        </div>
                        <span className="badge bg-success bg-opacity-10 text-success border mt-1">
                          Return Total: {formatTwoDigits(rowTotal)}
                        </span>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          checked={Boolean(bus.return_reached_drop)}
                          onChange={() => handleToggleBusStage(bNum, 'return_reached_drop', 'return_drop_time')}
                        />
                        <div className="small text-muted font-monospace mt-1">{bus.return_drop_time || '--:--'}</div>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          checked={Boolean(bus.ngo_undertaking_signed)}
                          onChange={() => handleToggleBusStage(bNum, 'ngo_undertaking_signed', null)}
                        />
                        <div className="small fw-bold mt-1">
                          {bus.ngo_undertaking_signed ? (
                            <span className="text-success">✓ Undertaking Taken</span>
                          ) : (
                            <span className="text-muted">Pending</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =====================================================================
          EDIT BUS MODAL (FOR STAGE 5 BOYS / GIRLS / NV HEADCOUNT)
         ===================================================================== */}
      {editingBus && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header text-white rounded-top-4" style={{ backgroundColor: '#23074d' }}>
                <h6 className="modal-title fw-bold">
                  Edit Children & NV Headcount — Bus #{editingBus.bus_number} ({editingBus.ngo_name || editingBus.ngo})
                </h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setEditingBus(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-4">
                    <label className="form-label small fw-bold">Boys (B)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control fw-bold text-center fs-5"
                      value={editingBus.onboard_boys || 0}
                      onChange={(e) => handleUpdateBusCounts(editingBus.bus_number, 'onboard_boys', e.target.value)}
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-bold">Girls (G)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control fw-bold text-center fs-5"
                      value={editingBus.onboard_girls || 0}
                      onChange={(e) => handleUpdateBusCounts(editingBus.bus_number, 'onboard_girls', e.target.value)}
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-bold">NGO Vol (NV)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control fw-bold text-center fs-5"
                      value={editingBus.onboard_ngo || 0}
                      onChange={(e) => handleUpdateBusCounts(editingBus.bus_number, 'onboard_ngo', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary fw-bold px-4" onClick={() => setEditingBus(null)}>
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          START OF OPTIONAL SECTION: 3. GYMNASTIC CHILDRENS TRACKING (14 BUSES)
          (You can delete or comment out from here down to END OF OPTIONAL SECTION)
         ===================================================================== */}
      
      {/* =====================================================================
          END OF OPTIONAL SECTION: 3. GYMNASTIC CHILDRENS TRACKING
         ===================================================================== */}

      {/* =====================================================================
          SECTION 6: GATE SECURITY & GUEST HEADCOUNT LIVE AGGREGATOR (GATES 11, 18, 20)
         ===================================================================== */}
      <div id="gate-traffic-section" className="card border-0 shadow-sm rounded-3 mb-5">
        <div className="card-header bg-dark text-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-2">
              <Users size={20} className="text-warning" />
              <h6 className="fw-bold mb-0">Gate Security & Guest Headcount Live Aggregator (Gates 11, 18, 20)</h6>
            </div>
            <button
              type="button"
              onClick={handleClearGateTraffic}
              className="btn btn-outline-light btn-sm fw-bold px-3 py-1 d-inline-flex align-items-center gap-1 shadow-sm"
            >
              <Trash2 size={14} />
              <span>Reset Gate Counts</span>
            </button>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="badge bg-primary px-3 py-2">Gate 11: {total11}</span>
            <span className="badge bg-info text-white px-3 py-2">Gate 18: {total18}</span>
            <span className="badge bg-warning text-dark px-3 py-2">Gate 20: {total20}</span>
            <span className="badge bg-success fw-bold px-3 py-2">Total Guests Entered: {grandTotalGuests}</span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle mb-0 text-center">
              <thead className="table-light text-uppercase small fw-bold">
                <tr>
                  <th className="py-3">Time Slot</th>
                  <th>Gate 11 Guest Count</th>
                  <th>Gate 18 Guest Count</th>
                  <th>Gate 20 Guest Count</th>
                  <th>Total Guests in Slot</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => {
                  const c11 = Number(trafficData['Gate 11']?.[slot] || 0);
                  const c18 = Number(trafficData['Gate 18']?.[slot] || 0);
                  const c20 = Number(trafficData['Gate 20']?.[slot] || 0);
                  return (
                    <tr key={slot}>
                      <td className="font-monospace fw-bold">{slot}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm text-center fw-bold text-primary mx-auto"
                          style={{ maxWidth: '120px' }}
                          value={c11 === 0 ? '' : c11}
                          placeholder="0"
                          disabled={trafficLoading}
                          onChange={(e) => handleGateInputChange('Gate 11', slot, e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm text-center fw-bold text-info mx-auto"
                          style={{ maxWidth: '120px' }}
                          value={c18 === 0 ? '' : c18}
                          placeholder="0"
                          disabled={trafficLoading}
                          onChange={(e) => handleGateInputChange('Gate 18', slot, e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm text-center fw-bold text-warning mx-auto"
                          style={{ maxWidth: '120px' }}
                          value={c20 === 0 ? '' : c20}
                          placeholder="0"
                          disabled={trafficLoading}
                          onChange={(e) => handleGateInputChange('Gate 20', slot, e.target.value)}
                        />
                      </td>
                      <td className="fw-bold text-success bg-success bg-opacity-10">{c11 + c18 + c20}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 7: MASTER USER & ROLE MANAGEMENT (20 REGISTERED STAFF)
         ===================================================================== */}
      <div id="user-management-section" className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-1">Alina Event 2026 — Master User & Role Management ({users.length} Registered Staff)</h6>
            <p className="text-white-50 small mb-0">Staff sign-in is verified by the secure authentication service.</p>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle mb-0">
              <thead className="table-light text-uppercase small fw-bold">
                <tr>
                  <th className="py-3 ps-3">Full Name</th>
                  <th>Mobile (Login ID)</th>
                  <th>Role</th>
                  <th>Depot / Bus</th>
                  <th>Assigned Location & NGO</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={idx}>
                    <td className="ps-3 fw-bold text-dark">{u.full_name}</td>
                    <td>
                      <span className="font-monospace text-primary fw-semibold">
                        <Phone size={14} className="me-1" />
                        {u.phone}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-primary bg-opacity-10 text-primary border px-2 py-1">
                        {u.role_label || u.role}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-dark text-white px-2 py-1">
                        {u.depot || 'All Depots'}
                      </span>
                    </td>
                    <td className="small text-muted">{u.assigned_location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
