import React from 'react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';

export default function NgoDashboard() {
  const { assignments } = useAuth();

  return (
    <div className="container-fluid px-0">
      <h4 className="fw-bold text-dark mb-1">NGO Coordinator (NGO IC) Dashboard</h4>
      <p className="text-secondary small mb-4">
        View your assigned buses, expected child counts, and boarding confirmation status.
      </p>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <h6 className="fw-bold mb-0">Assigned Buses & Expected Headcounts</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Bus Number</th>
                <th>Depot</th>
                <th>Expected Boys</th>
                <th>Expected Girls</th>
                <th>Total Children</th>
                <th>NGO Volunteers</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No buses currently assigned or running in demo preview.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="fw-bold text-primary">{a.buses?.bus_number}</td>
                    <td>{a.buses?.depots?.depot_name}</td>
                    <td>{a.expected_boys}</td>
                    <td>{a.expected_girls}</td>
                    <td className="fw-bold">{(a.expected_boys || 0) + (a.expected_girls || 0)}</td>
                    <td>{a.expected_ngo_volunteers}</td>
                    <td>
                      <StatusBadge status="active" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
