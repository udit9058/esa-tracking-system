import React, { useEffect, useState } from 'react';
import { Clock, Users, CheckCircle2, LogOut, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GATE_TIME_SLOTS } from '../../utils/masterLogisticData';
import {
  createEmptyGateTrafficData,
  fetchGateTrafficData,
  saveGateTrafficCounts,
  saveLocalGateTrafficData
} from '../../lib/gateTraffic';

export default function GuardDashboard() {
  const { profile, signOut } = useAuth();
  const [trafficData, setTrafficData] = useState(() => createEmptyGateTrafficData());
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const phone = String(profile?.phone || '').trim();
  let gateName = 'Gate 20';
  if (phone === '9812345011') gateName = 'Gate 11';
  else if (phone === '9880156418') gateName = 'Gate 18';
  else if (phone === '9845012320') gateName = 'Gate 20';

  const gateCounts = trafficData[gateName] || {};

  useEffect(() => {
    let active = true;

    fetchGateTrafficData()
      .then((savedTraffic) => {
        if (active) {
          setTrafficData(savedTraffic);
          saveLocalGateTrafficData(savedTraffic);
          setErrorMsg('');
        }
      })
      .catch((error) => {
        console.error('Unable to load gate counts:', error);
        if (active) setErrorMsg(error.message);
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleInputChange = (timeSlot, value) => {
    const num = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    setTrafficData((currentData) => ({
      ...currentData,
      [gateName]: {
        ...(currentData[gateName] || {}),
        [timeSlot]: num
      }
    }));
  };

  const handleSubmitCounts = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await saveGateTrafficCounts(gateName, gateCounts);
      saveLocalGateTrafficData(trafficData);
      setSuccessMsg(`Guest counts for ${gateName} successfully saved and submitted to Control Room!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Unable to save gate counts:', error);
      setErrorMsg(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const fleetBackup = localStorage.getItem('esa_alina_2026_fleet_v1');
    const usersBackup = localStorage.getItem('esa_alina_2026_users_v1');
    const gateBackup  = localStorage.getItem('esa_alina_2026_gate_traffic_v1');
    
    localStorage.clear();
    sessionStorage.clear();
    
    if (fleetBackup) localStorage.setItem('esa_alina_2026_fleet_v1', fleetBackup);
    if (usersBackup) localStorage.setItem('esa_alina_2026_users_v1', usersBackup);
    if (gateBackup)  localStorage.setItem('esa_alina_2026_gate_traffic_v1', gateBackup);

    await signOut();
    window.location.replace('/login');
  };

  const totalGateGuests = Object.values(gateCounts).reduce((acc, val) => acc + Number(val || 0), 0);

  return (
    <div className="container py-4" style={{ maxWidth: '700px' }}>
      <div className="card border-0 shadow-sm mb-4 bg-dark text-white">
        <div className="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <span className="badge bg-warning text-dark fw-bold mb-1">
              SECURITY GATE GUARD PORTAL • {gateName.toUpperCase()}
            </span>
            <h5 className="fw-bold mb-1">{profile?.full_name || `Security Guard (${gateName})`}</h5>
            <div className="small text-white-50">
              📍 Mobile ID: {phone} | NMACC {gateName} Entry Point
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="text-end">
              <div className="fs-3 fw-bold text-success">{totalGateGuests}</div>
              <div className="small text-white-50">Total Guests</div>
            </div>
            <button
              onClick={handleSignOut}
              className="btn btn-outline-light btn-sm fw-bold d-flex align-items-center gap-1"
              title="Sign Out"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 mb-3 shadow-sm">
          <CheckCircle2 size={18} />
          <span className="fw-semibold small">{successMsg}</span>
        </div>
      )}
      {errorMsg && <div className="alert alert-danger py-2 mb-3 shadow-sm">{errorMsg}</div>}

      <form onSubmit={handleSubmitCounts}>
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-primary text-white py-3 d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
              <Users size={18} />
              <span>{gateName} — Hourly Guest Count Entry</span>
            </h6>
            <button type="submit" disabled={saving || loadingData} className="btn btn-warning btn-sm fw-bold px-3 text-dark d-flex align-items-center gap-1 shadow-sm">
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Submit Counts'}</span>
            </button>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle mb-0 text-center">
                <thead className="table-light text-uppercase small">
                  <tr>
                    <th className="py-3" style={{ width: '30%' }}>Gate</th>
                    <th style={{ width: '35%' }}>Time Slot</th>
                    <th style={{ width: '35%' }}>Guest Count</th>
                  </tr>
                </thead>
                <tbody>
                  {GATE_TIME_SLOTS.map((slot) => (
                    <tr key={slot}>
                      <td className="fw-bold text-primary">{gateName}</td>
                      <td className="font-monospace fw-semibold">
                        <Clock size={14} className="text-muted me-1" />
                        {slot}
                      </td>
                      <td>
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="0"
                          className="form-control form-control-sm w-50 mx-auto text-center fw-bold fs-6"
                          value={gateCounts[slot] ?? ''}
                          placeholder="0"
                          disabled={loadingData || saving}
                          onChange={(e) => handleInputChange(slot, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card-footer bg-light p-3 text-end">
            <button type="submit" disabled={saving || loadingData} className="btn btn-success fw-bold px-4 d-inline-flex align-items-center gap-2 shadow-sm">
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Submit / Save All Guest Counts'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
