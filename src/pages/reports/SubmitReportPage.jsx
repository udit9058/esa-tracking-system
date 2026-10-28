import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Bus,
  Users,
  ShieldCheck,
  ArrowLeft,
  Send,
  Building2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roleConfig';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function SubmitReportPage() {
  const navigate = useNavigate();
  const { profile, isDevSession } = useAuth();
  const userRole = profile?.role || ROLES.CONTROL_ROOM;

  // Determine allowed stages based on role duties
  let allowedStages = [1, 2, 3, 4, 5, 6, 7];
  if (userRole === ROLES.BUS_IC) {
    allowedStages = [1, 2, 6, 7];
  } else if (userRole === ROLES.NGO_IC) {
    allowedStages = [2, 5, 6];
  } else if (userRole === ROLES.DEPOT_IC) {
    allowedStages = [1, 3, 7];
  }

  const [activeStage, setActiveStage] = useState(allowedStages[0] || 1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submittedReports, setSubmittedReports] = useState([]);

  // Form States
  const [reportingTime, setReportingTime] = useState(
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
  const [expectedBusesInput, setExpectedBusesInput] = useState(25);
  const [arrivedBusIcCount, setArrivedBusIcCount] = useState(0);
  const [arrivalStatus, setArrivalStatus] = useState('In Progress');
  
  // Yes/No Checklist for Bus IC & NGO IC
  const [allChildrenConfirmed, setAllChildrenConfirmed] = useState('Yes');
  const [boysCount, setBoysCount] = useState(20);
  const [girlsCount, setGirlsCount] = useState(20);
  const [ngoCount, setNgoCount] = useState(2);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      if (!isSupabaseConfigured || !supabase || isDevSession) return;
      try {
        const { data: reportsData } = await supabase
          .from('operational_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (reportsData) setSubmittedReports(reportsData);
      } catch (err) {
        console.error('Error loading reports:', err);
      }
    };
    loadInitialData();
  }, [isDevSession]);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (allChildrenConfirmed === 'No' && !remarks.trim()) {
      setErrorMsg('Please provide a mandatory reason/remark in the comments since confirmation is marked No.');
      return;
    }

    setLoading(true);

    try {
      const reportPayload = {
        stage_number: activeStage,
        reporting_time: reportingTime,
        expected_buses: expectedBusesInput,
        arrived_buses: Number(arrivedBusIcCount),
        pending_buses: Math.max(0, expectedBusesInput - Number(arrivedBusIcCount)),
        status: arrivalStatus,
        boys_count: Number(boysCount),
        girls_count: Number(girlsCount),
        ngo_count: Number(ngoCount),
        all_children_confirmed: allChildrenConfirmed === 'Yes',
        remarks: remarks.trim(),
        submitted_by: profile?.user_id || 'dev-user',
        submitted_at: new Date().toISOString(),
      };

      if (isDevSession || !isSupabaseConfigured) {
        setSubmittedReports((prev) => [reportPayload, ...prev]);
        setSuccessMsg(`Stage ${activeStage} report submitted successfully (Dev Mode).`);
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('operational_reports').insert([reportPayload]);
      if (error) throw error;

      setSuccessMsg(`Stage ${activeStage} operational report submitted successfully.`);
      const { data: refreshed } = await supabase
        .from('operational_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (refreshed) setSubmittedReports(refreshed);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  const stageTitles = {
    1: 'Stage 1: Bus IC Arrival at Depot',
    2: 'Stage 2: Student Boarding & Headcount Verification (Yes/No Confirmation)',
    3: 'Stage 3: Convoy Departure from Depot to Wankhede Stadium',
    4: 'Stage 4: Stadium Arrival & Security Checkpoint Clearing',
    5: 'Stage 5: Seating & Snack Distribution inside Stadium',
    6: 'Stage 6: Match Conclusion & Return Boarding',
    7: 'Stage 7: Safe Return & Final Reconciliation at Depot',
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold text-dark mb-1">Role-Based Operational Stage Reporting</h4>
          <p className="text-secondary small mb-0">
            Assigned duties and responsibilities configured for your operational level.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {errorMsg && (
        <div className="alert alert-danger d-flex align-items-start gap-2 mb-3">
          <AlertTriangle size={18} className="flex-shrink-0 mt-1" />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success d-flex align-items-start gap-2 mb-3">
          <CheckCircle2 size={18} className="flex-shrink-0 mt-1" />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Role-filtered Stage Selector Tabs */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <label className="form-label fw-bold small text-muted text-uppercase mb-2">
            Permitted Stages for Your Role ({userRole})
          </label>
          <div className="d-flex flex-wrap gap-2">
            {allowedStages.map((stageNum) => (
              <button
                key={stageNum}
                type="button"
                className={`btn btn-sm px-3 py-2 fw-semibold ${
                  activeStage === stageNum ? 'btn-primary shadow-sm' : 'btn-outline-secondary'
                }`}
                onClick={() => setActiveStage(stageNum)}
              >
                Stage {stageNum}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reporting Form Card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-primary">{stageTitles[activeStage]}</h5>
          <span className="badge bg-secondary-subtle text-secondary border">Stage {activeStage}</span>
        </div>
        <div className="card-body p-4">
          <form onSubmit={handleSubmitReport}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label fw-semibold">Reporting Time</label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-secondary">
                    <Clock size={18} />
                  </span>
                  <input
                    type="time"
                    className="form-control"
                    value={reportingTime}
                    onChange={(e) => setReportingTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">Expected Buses / Allocation</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={expectedBusesInput}
                  onChange={(e) => setExpectedBusesInput(Number(e.target.value))}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">Arrived Count</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={arrivedBusIcCount}
                  onChange={(e) => setArrivedBusIcCount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">Execution Status</label>
                <select
                  className="form-select"
                  value={arrivalStatus}
                  onChange={(e) => setArrivalStatus(e.target.value)}
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed On Time">Completed On Time</option>
                  <option value="Delayed / Discrepancy">Delayed / Discrepancy</option>
                </select>
              </div>

              {(activeStage === 2 || activeStage === 6) && (
                <>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Allocated Boys Responsibility</label>
                    <input
                      type="number"
                      className="form-control"
                      value={boysCount}
                      onChange={(e) => setBoysCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Allocated Girls Responsibility</label>
                    <input
                      type="number"
                      className="form-control"
                      value={girlsCount}
                      onChange={(e) => setGirlsCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Allocated NGO Volunteers Count</label>
                    <input
                      type="number"
                      className="form-control"
                      value={ngoCount}
                      onChange={(e) => setNgoCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-primary">
                      Are all allocated children safely boarded/accounted for? (Yes / No)
                    </label>
                    <select
                      className="form-select fw-bold"
                      value={allChildrenConfirmed}
                      onChange={(e) => setAllChildrenConfirmed(e.target.value)}
                    >
                      <option value="Yes">Yes - All Verified & Safe</option>
                      <option value="No">No - Discrepancy Flagged</option>
                    </select>
                  </div>
                </>
              )}

              <div className="col-12">
                <label className="form-label fw-semibold">
                  Operational Remarks / Reason {allChildrenConfirmed === 'No' && <span className="text-danger">*Mandatory if No</span>}
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Enter remarks or reason for any discrepancies..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  required={allChildrenConfirmed === 'No'}
                ></textarea>
              </div>

              <div className="col-12 text-end">
                <button
                  type="submit"
                  className="btn btn-primary btn-lg px-5 fw-semibold d-inline-flex align-items-center gap-2 shadow-sm"
                  disabled={loading}
                >
                  <Send size={18} />
                  <span>{loading ? 'Submitting...' : `Submit Stage ${activeStage} Report`}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
