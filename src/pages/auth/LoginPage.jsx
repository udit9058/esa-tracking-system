import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Phone, Lock, ArrowRight, AlertCircle, PhoneCall } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roleConfig';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginWithPhoneAndPin } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit registered mobile number.');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await loginWithPhoneAndPin(cleanPhone, password);
      const isBusLevel =
        loggedInUser.role === (ROLES?.BUS_IC || 'bus_ic') ||
        loggedInUser.role === 'ngo_ic' ||
        loggedInUser.role === 'depot_ic';

      const dashboardRoute =
        loggedInUser.role === ROLES.GUARD
          ? '/dashboard/guard'
          : isBusLevel
            ? '/dashboard/bus'
            : '/dashboard/control-room';

      navigate(dashboardRoute, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your mobile number and PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-dark px-3"
      style={{ background: 'linear-gradient(135deg, #0a192f 0%, #0f172a 100%)' }}
    >
      <div className="card border-0 shadow-lg" style={{ maxWidth: '420px', width: '100%', borderRadius: '12px' }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex p-3 mb-3">
              <Shield size={32} />
            </div>
            <h4 className="fw-bold text-dark mb-1">RELIANCE ESA</h4>
            <p className="text-secondary small mb-0">Alina Event Smart Operations Portal • NMACC Mumbai</p>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 small py-2 mb-3">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary text-uppercase">
                Registered Mobile Number
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-secondary">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  className="form-control bg-light border-start-0 ps-0 fw-semibold"
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary text-uppercase">
                Operational PIN / Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-secondary">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  className="form-control bg-light border-start-0 ps-0 fw-semibold"
                  placeholder="Enter operational PIN"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-100 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
            >
              <span>{loading ? 'Signing In...' : 'Sign In to Portal'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Emergency Hotline Footer */}
          <div className="mt-4 pt-3 border-top text-center">
            <div className="text-danger fw-bold small mb-1 d-flex align-items-center justify-content-center gap-1">
              <PhoneCall size={14} />
              <span>Control Room Emergency Desk</span>
            </div>
            <a
              href="tel:02235706039"
              className="badge bg-danger text-white text-decoration-none fs-6 font-monospace px-3 py-2 shadow-sm"
            >
              022-35706039
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
