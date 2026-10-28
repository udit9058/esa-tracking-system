import React from 'react';
import { Menu, ShieldAlert, LogOut, User, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/roleConfig';

export default function Header({ onToggleSidebar }) {
  const { profile, isDevSession, signOut } = useAuth();

  return (
    <header className="navbar navbar-expand bg-white border-bottom sticky-top px-3 py-2 shadow-sm">
      <div className="container-fluid px-0 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-lg-none p-2"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>

          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-primary fs-6">ESA Smart Operations Portal</span>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle d-none d-sm-inline-flex align-items-center gap-1">
                <MapPin size={12} /> NMACC, Mumbai
              </span>
            </div>
            {isDevSession && (
              <div className="text-danger fw-semibold d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                {/* <ShieldAlert size={13} />  */}
              </div>
            )}
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          {profile && (
            <div className="text-end d-none d-md-block">
              <div className="fw-semibold text-dark small d-flex align-items-center justify-content-end gap-1">
                <User size={14} className="text-primary" />
                {profile.full_name || 'Authorized Volunteer'}
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                {ROLE_LABELS[profile.role] || profile.role}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={signOut}
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 px-2 py-1"
            title="Sign Out"
          >
            <LogOut size={16} />
            <span className="d-none d-sm-inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

