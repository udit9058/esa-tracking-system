import React, { useState, useEffect } from 'react';
import { Users, FileCheck2, Trash2, PlusCircle, Download, MapPin, X, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { ROLES } from '../../utils/roleConfig';

const DEFAULT_USERS = [
  {
    user_id: 'bus-saurabh',
    full_name: 'Saurabh Thakur',
    phone: '8219449011',
    role: ROLES?.BUS_IC || 'bus_ic',
    role_label: 'Bus Incharge (Bus IC)',
    assigned_location: 'NMACC Gate 4 Event Zone (Mumbai)',
    boys_count: 18,
    girls_count: 14,
    volunteers_count: 2,
    status: 'ACTIVE'
  },
  {
    user_id: 'admin-udit',
    full_name: 'Udit Shyam Sharma (Prime Developer)',
    phone: '8780675140',
    role: ROLES?.CONTROL_ROOM_IC || 'control_room_ic',
    role_label: 'Global Control Room IC',
    assigned_location: 'Global Command Center',
    boys_count: 0,
    girls_count: 0,
    volunteers_count: 0,
    status: 'ACTIVE'
  }
];

export default function UserManagementPage() {
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [reports, setReports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: '',
    phone: '',
    role: ROLES?.BUS_IC || 'bus_ic',
    assigned_location: 'NMACC Gate 4 Event Zone (Mumbai)',
    boys_count: 18,
    girls_count: 14,
    volunteers_count: 2
  });

  const loadData = async () => {
    // Load provisioned users
    try {
      const savedUsers = JSON.parse(localStorage.getItem('esa_provisioned_users') || '[]');
      if (savedUsers.length > 0) {
        const merged = [...DEFAULT_USERS];
        savedUsers.forEach((su) => {
          if (!merged.some((m) => m.phone === su.phone)) {
            merged.unshift(su);
          }
        });
        setUsers(merged);
      } else {
        localStorage.setItem('esa_provisioned_users', JSON.stringify(DEFAULT_USERS));
      }
    } catch {
      // ignore
    }

    // Load submitted reports
    let allReports = [];
    try {
      const local = JSON.parse(localStorage.getItem('esa_submitted_reports') || '[]');
      allReports = [...local];
    } catch {
      // ignore
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('operational_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted = data.map((r) => ({
            id: r.id,
            stage_number: r.stage_number || 1,
            reporting_time: r.reporting_time || '08:30',
            status: r.status || 'Verified & Locked',
            submitted_by_name: 'Saurabh Thakur (Bus IC)',
            submitted_by_role: 'Bus Incharge (Bus IC)',
            boys_count: r.boys_count || 18,
            girls_count: r.girls_count || 14,
            volunteers_count: r.volunteers_count || 2,
            total_pax: (r.boys_count || 18) + (r.girls_count || 14) + (r.volunteers_count || 2),
            location: 'NMACC Gate 4 Event Zone (Mumbai)',
            created_at: r.created_at || new Date().toISOString()
          }));
          allReports = [...formatted, ...allReports];
        }
      } catch {
        // ignore
      }
    }

    setReports(allReports);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const cleanPhone = newUser.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    const roleMap = {
      [ROLES?.BUS_IC || 'bus_ic']: 'Bus Incharge (Bus IC)',
      ngo_ic: 'NGO Coordinator (NGO IC)',
      depot_ic: 'Depot Incharge (Depot IC)',
      [ROLES?.CONTROL_ROOM_IC || 'control_room_ic']: 'Global Control Room IC'
    };

    const created = {
      user_id: 'usr-' + Date.now(),
      full_name: newUser.full_name.trim(),
      phone: cleanPhone,
      role: newUser.role,
      role_label: roleMap[newUser.role] || 'Bus Incharge (Bus IC)',
      assigned_location: newUser.assigned_location,
      boys_count: Number(newUser.boys_count) || 0,
      girls_count: Number(newUser.girls_count) || 0,
      volunteers_count: Number(newUser.volunteers_count) || 0,
      status: 'ACTIVE'
    };

    const updatedUsers = [created, ...users.filter((u) => u.phone !== cleanPhone)];
    setUsers(updatedUsers);
    localStorage.setItem('esa_provisioned_users', JSON.stringify(updatedUsers));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').upsert([
          {
            phone: created.phone,
            full_name: created.full_name,
            role: created.role,
            assigned_location: created.assigned_location
          }
        ]);
      } catch {
        // ignore
      }
    }

    setShowModal(false);
    setNewUser({
      full_name: '',
      phone: '',
      role: ROLES?.BUS_IC || 'bus_ic',
      assigned_location: 'NMACC Gate 4 Event Zone (Mumbai)',
      boys_count: 18,
      girls_count: 14,
      volunteers_count: 2
    });
  };

  const handleDeleteUser = (phone) => {
    if (phone === '8780675140') {
      alert('Cannot delete primary Global Control Room IC account.');
      return;
    }
    const updated = users.filter((u) => u.phone !== phone);
    setUsers(updated);
    localStorage.setItem('esa_provisioned_users', JSON.stringify(updated));
  };

  const handleDeleteReport = (id) => {
    const updated = reports.filter((r) => r.id !== id);
    setReports(updated);
    try {
      const local = JSON.parse(localStorage.getItem('esa_submitted_reports') || '[]');
      localStorage.setItem('esa_submitted_reports', JSON.stringify(local.filter((r) => r.id !== id)));
    } catch {
      // ignore
    }
  };

  const exportToCSV = () => {
    if (reports.length === 0) {
      alert('No reports available to export.');
      return;
    }

    const headers = [
      'Report ID',
      'Stage',
      'Reporting Time',
      'Status',
      'Submitted By',
      'Role',
      'Boys Count',
      'Girls Count',
      'Volunteers Count',
      'Total Passengers',
      'Assigned Location',
      'Submission Timestamp'
    ];

    const rows = reports.map((r) => [
      r.id,
      r.stage_number,
      r.reporting_time,
      `"${r.status}"`,
      `"${r.submitted_by_name}"`,
      `"${r.submitted_by_role}"`,
      r.boys_count ?? 18,
      r.girls_count ?? 14,
      r.volunteers_count ?? 2,
      r.total_pax ?? 34,
      `"${r.location || 'NMACC Gate 4 Event Zone (Mumbai)'}"`,
      `"${r.created_at}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'esa_operational_reports_audit.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold text-dark mb-1">User & Role Management & Audit Logs</h4>
          <p className="text-secondary small mb-0">
            Provision Bus ICs, NGO ICs, and Depot ICs, and export live CSV audit logs.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            onClick={exportToCSV}
            className="btn btn-success btn-sm fw-semibold d-flex align-items-center gap-2 shadow-sm"
          >
            <Download size={16} />
            <span>Export CSV Report</span>
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-sm fw-semibold d-flex align-items-center gap-2 shadow-sm"
          >
            <PlusCircle size={16} />
            <span>Provision New User & Allocations</span>
          </button>
        </div>
      </div>

      {/* Provision User Modal */}
      {showModal && (
        <div className="card border-primary border-2 shadow mb-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
            <span className="fw-bold small text-uppercase">Provision New Field Coordinator</span>
            <button type="button" className="btn btn-sm text-white p-0" onClick={() => setShowModal(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateUser} className="row g-3">
              <div className="col-md-3">
                <label className="form-label small fw-bold">Full Name</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. Rahul Patil"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">10-Digit Mobile (Login ID)</label>
                <input
                  type="tel"
                  maxLength={10}
                  className="form-control form-control-sm"
                  placeholder="98XXXXXXXX"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value.replace(/\D/g, '') })}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">Operational Role</label>
                <select
                  className="form-select form-select-sm"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value={ROLES?.BUS_IC || 'bus_ic'}>Bus Incharge (Bus IC)</option>
                  <option value="ngo_ic">NGO Coordinator (NGO IC)</option>
                  <option value="depot_ic">Depot Incharge (Depot IC)</option>
                  <option value={ROLES?.CONTROL_ROOM_IC || 'control_room_ic'}>Global Control Room IC</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">Assigned Location / Bus</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={newUser.assigned_location}
                  onChange={(e) => setNewUser({ ...newUser, assigned_location: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-bold">Boys Count</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={newUser.boys_count}
                  onChange={(e) => setNewUser({ ...newUser, boys_count: e.target.value })}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-bold">Girls Count</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={newUser.girls_count}
                  onChange={(e) => setNewUser({ ...newUser, girls_count: e.target.value })}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-bold">Volunteers</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={newUser.volunteers_count}
                  onChange={(e) => setNewUser({ ...newUser, volunteers_count: e.target.value })}
                />
              </div>
              <div className="col-md-6 d-flex align-items-end justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm fw-bold px-4">
                  Save & Activate User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registered Users Table */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h6 className="fw-bold mb-0 text-dark">Registered Operational Users & Allocations ({users.length})</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase">
                <tr>
                  <th className="py-3 px-3">Full Name</th>
                  <th>Phone / Login ID</th>
                  <th>Role</th>
                  <th>Assigned Location</th>
                  <th>Headcount (B / G / V)</th>
                  <th>Status</th>
                  <th className="text-end px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.phone}>
                    <td className="px-3 fw-semibold text-dark">{u.full_name}</td>
                    <td className="font-monospace fw-semibold">{u.phone}</td>
                    <td>
                      <span className="badge bg-primary-subtle text-primary border">
                        {u.role_label || u.role}
                      </span>
                    </td>
                    <td>
                      <span className="text-danger fw-semibold small">📍 {u.assigned_location}</span>
                    </td>
                    <td>
                      <span className="font-monospace small bg-light px-2 py-1 rounded">
                        B: {u.boys_count} | G: {u.girls_count} | V: {u.volunteers_count}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-success-subtle text-success">{u.status || 'ACTIVE'}</span>
                    </td>
                    <td className="text-end px-3">
                      <button
                        onClick={() => handleDeleteUser(u.phone)}
                        className="btn btn-outline-danger btn-sm"
                        title="Remove User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Submitted Reports Audit Log */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <FileCheck2 size={18} className="text-primary" />
            <span>Submitted Reports Audit Log & Passenger Manifests</span>
          </h6>
          <span className="badge bg-primary text-white">Total Reports: {reports.length}</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase">
                <tr>
                  <th className="py-3 px-3">Stage / Time</th>
                  <th>Submitted By</th>
                  <th>Headcount Breakdown (B / G / V)</th>
                  <th>Assigned Destination</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th className="text-end px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted small">
                      No operational stage reports submitted yet.
                    </td>
                  </tr>
                ) : (
                  reports.map((rep) => (
                    <tr key={rep.id}>
                      <td className="px-3">
                        <div className="fw-bold text-primary">Stage {rep.stage_number}</div>
                        <span className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                          {rep.reporting_time}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{rep.submitted_by_name}</div>
                        <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '0.7rem' }}>
                          {rep.submitted_by_role}
                        </span>
                      </td>
                      <td>
                        <span className="font-monospace small bg-light px-2 py-1 rounded border fw-bold text-dark">
                          B: {rep.boys_count ?? 18} | G: {rep.girls_count ?? 14} | V: {rep.volunteers_count ?? 2}
                        </span>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Total: {rep.total_pax ?? 34} Pax
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1 text-dark small fw-semibold">
                          <MapPin size={14} className="text-danger flex-shrink-0" />
                          <span>{rep.location || 'NMACC Gate 4 Event Zone (Mumbai)'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          {rep.status}
                        </span>
                      </td>
                      <td className="text-muted small font-monospace">
                        {new Date(rep.created_at).toLocaleString()}
                      </td>
                      <td className="text-end px-3">
                        <button
                          onClick={() => handleDeleteReport(rep.id)}
                          className="btn btn-outline-danger btn-sm"
                          title="Delete Report"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
