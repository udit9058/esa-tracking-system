import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Phone, PhoneCall, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithPhoneAndPin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    if (!cleanPhone) {
      setError('Please enter your mobile number or Guard ID.');
      return;
    }
    setLoading(true);
    try {
      const userProfile = await loginWithPhoneAndPin(cleanPhone, cleanPin);
      if (userProfile?.role === 'guard') {
        navigate('/dashboard/bus', { replace: true });
      } else if (userProfile?.role === 'control_room_ic') {
        navigate('/dashboard/control-room', { replace: true });
      } else {
        navigate('/dashboard/bus', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card border-0 shadow-lg p-4" style={{ maxWidth: '420px', width: '100%' }}>
        <div className="text-center mb-4">
          <div className="bg-primary text-white p-3 rounded-circle d-inline-flex align-items-center justify-content-center shadow mb-3">
            <Shield size={32} />
          </div>
          <h3 className="fw-bold text-dark mb-1">RELIANCE ESA</h3>
          <p className="text-muted small mb-0">Alina Event Smart Operations Portal • NMACC Mumbai</p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 small py-2 mb-3 shadow-sm">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="vstack gap-3">
          <div>
            <label className="form-label small fw-bold text-secondary text-uppercase">Registered Mobile Number / Guard ID</label>
            <div className="input-group">
              <span className="input-group-text bg-white text-muted">
                <Phone size={16} />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 8780675140 or 11, 18, 20"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label small fw-bold text-secondary text-uppercase">Operational PIN / Password</label>
            <div className="input-group">
              <span className="input-group-text bg-white text-muted">
                <Lock size={16} />
              </span>
              <input
                type="password"
                className="form-control"
                placeholder="Enter operational PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg fw-bold w-100 shadow-sm py-2 mt-2"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal →'}
          </button>
        </form>

        <div className="text-center mt-4 pt-3 border-top">
          <div className="text-muted small mb-1">Control Room Emergency Desk</div>
          <a href="tel:02235706039" className="btn btn-danger btn-sm fw-bold d-inline-flex align-items-center gap-1 shadow-sm">
            <PhoneCall size={14} />
            <span>022-35706039</span>
          </a>
        </div>
      </div>
    </div>
  );
}
