import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_DEFAULT_ROUTES, ROLE_LABELS } from '../../utils/roleConfig';

export default function UnauthorizedPage() {
  const { profile } = useAuth();
  const fallbackRoute = profile?.role ? ROLE_DEFAULT_ROUTES[profile.role] : '/login';

  return (
    <div className="container d-flex flex-column justify-content-center align-items-center min-vh-100 text-center py-5">
      <div className="card shadow-sm border-danger-subtle p-4 p-md-5" style={{ maxWidth: '500px' }}>
        <div className="text-danger mb-3">
          <ShieldOff size={56} />
        </div>
        <h3 className="fw-bold text-dark">Access Restricted</h3>
        <p className="text-secondary mb-4">
          Your current operational role (
          <strong>{profile?.role ? ROLE_LABELS[profile.role] : 'Unverified'}</strong>) is not authorized to view or
          modify this section. All unauthorized access attempts are logged.
        </p>
        <Link to={fallbackRoute} className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2">
          <ArrowLeft size={18} />
          Return to My Assigned Dashboard
        </Link>
      </div>
    </div>
  );
}
