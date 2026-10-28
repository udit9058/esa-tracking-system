import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function DepotDashboard() {
  const { assignments } = useAuth();

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold text-dark mb-1">Depot Incharge (Depot IC) Dashboard</h4>
          <p className="text-secondary small mb-0">
            Monitor Bus IC arrivals, complete Depot Readiness checklists, and track bus departures.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/reports/submit?stage=1" className="btn btn-primary btn-sm fw-semibold">
            Submit Report 1 (Bus IC Arrival)
          </Link>
          <Link to="/reports/submit?stage=2" className="btn btn-success btn-sm fw-semibold">
            Submit Report 2 (Depot Readiness)
          </Link>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-secondary small">Report 1: Bus IC Arrival at Depot</div>
            <div className="fs-5 fw-bold text-primary mt-1">Stage 1 Action</div>
            <p className="small text-muted mb-2">Record arrived vs. pending Bus ICs at your depot.</p>
            <Link to="/reports/submit?stage=1" className="btn btn-outline-primary btn-sm">
              Open Stage 1 Form
            </Link>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-secondary small">Report 2: Depot Readiness Checklist</div>
            <div className="fs-5 fw-bold text-success mt-1">Medical, Food, Water, Stickers</div>
            <p className="small text-muted mb-2">Verify all 5 readiness checks before buses depart.</p>
            <Link to="/reports/submit?stage=2" className="btn btn-outline-success btn-sm">
              Open Stage 2 Checklist
            </Link>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-secondary small">Assigned Depot Buses</div>
            <div className="fs-4 fw-bold text-dark mt-1">{assignments.length || 25}</div>
            <p className="small text-muted mb-0">Active buses linked to this depot</p>
          </div>
        </div>
      </div>
    </div>
  );
}
