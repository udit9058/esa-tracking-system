import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, MapPin, PhoneCall, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/roleConfig';

export default function MainLayout({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const userRole = profile?.role || 'control_room_ic';

  return (
    <div className="min-vh-100 d-flex flex-column bg-light w-100 overflow-hidden">
      {/* Responsive Top Header */}
      <header className="bg-white border-bottom px-3 py-2 shadow-sm w-100">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          {/* Brand & Location */}
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary text-white p-2 rounded d-flex align-items-center justify-content-center flex-shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <div className="d-flex align-items-center flex-wrap gap-2">
                <span className="fw-bold text-primary esa-header-title" style={{ fontSize: '1.05rem' }}>
                  ESA Smart Portal
                </span>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle d-inline-flex align-items-center gap-1 px-2 py-1" style={{ fontSize: '0.7rem' }}>
                  <MapPin size={11} />
                  <span>NMACC, Mumbai</span>
                </span>
              </div>
              <div className="text-muted d-md-none" style={{ fontSize: '0.7rem' }}>
                {profile?.full_name || 'Udit Shyam Sharma'} • {ROLE_LABELS?.[userRole] || userRole}
              </div>
            </div>
          </div>

          {/* Right Action Controls (SOS + User Info + Sign Out) */}
          <div className="d-flex align-items-center gap-2 ms-auto">
            <a
              href="tel:02235706039"
              className="btn btn-danger btn-sm fw-bold d-inline-flex align-items-center gap-1 px-2 py-1 shadow-sm"
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              <PhoneCall size={13} />
              <span>SOS: 022-35706039</span>
            </a>

            <div className="text-end border-start ps-2 d-none d-md-block">
              <div className="fw-bold text-dark" style={{ fontSize: '0.8rem' }}>
                {profile?.full_name || 'Udit Shyam Sharma'}
              </div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                {ROLE_LABELS?.[userRole] || userRole}
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1 fw-semibold px-2 py-1"
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              <LogOut size={13} />
              <span className="d-none d-sm-inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container-fluid p-2 p-md-4 flex-grow-1 w-100">
        {children ? children : <Outlet />}
      </main>
    </div>
  );
}
