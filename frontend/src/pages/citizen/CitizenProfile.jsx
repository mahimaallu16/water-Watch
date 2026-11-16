import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { User, Bell, MapPin, Save } from 'lucide-react';

export default function CitizenProfile() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.citizen_profile?.address || '');
  const [radiusKm, setRadiusKm] = useState(user?.citizen_profile?.preferred_radius_km || 5.0);
  const [notifyInApp, setNotifyInApp] = useState(user?.citizen_profile?.notify_in_app ?? true);
  const [notifyEmail, setNotifyEmail] = useState(user?.citizen_profile?.notify_email ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authService.updateProfile({
        full_name: fullName,
        phone,
        address,
        preferred_radius_km: radiusKm,
        notify_in_app: notifyInApp,
        notify_email: notifyEmail
      });
      showToast('Profile and preferences updated successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">
          <h2>Account & Preferences</h2>
          <p>Manage your profile, primary contact details, and neighborhood water alerts.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-header">
          <h3>Personal Details</h3>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              value={user?.email || ''}
              disabled
              style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Email cannot be changed directly</span>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              className="form-control"
              placeholder="+1-555-0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {user?.role === 'citizen' && (
            <div className="form-group">
              <label>Residential Address / Locality</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 45 Maple Avenue"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1.5rem 0' }} />

          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bell size={18} /> Notification Preferences
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifyInApp}
                onChange={(e) => setNotifyInApp(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: '0.9rem', color: '#334155' }}>
                Receive real-time in-app notifications when my reports change status
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: '0.9rem', color: '#334155' }}>
                Receive emergency notification emails when water maintenance occurs nearby
              </span>
            </label>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

