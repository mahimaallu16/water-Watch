import React, { useState, useEffect } from 'react';
import {
  Users,
  Wrench,
  Shield,
  CheckCircle,
  XCircle,
  Search,
  UserPlus,
  X,
  Mail,
  Lock,
  Phone,
  Briefcase,
  MapPin,
  Hash
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function WorkerManagement() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    employee_id: '',
    zone: 'Central',
    specialization: 'Pipe Leak Repair',
    department: 'Water Operations',
    max_active_tasks: 5
  });

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/users/workers');
      setWorkers(data || []);
    } catch (e) {
      console.error('Failed to load workers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleToggleAvailability = async (worker) => {
    const prof = worker.worker_profile;
    const nextAvail = !prof?.is_available;
    try {
      await api.put(`/users/workers/${worker.id}`, {
        is_available: nextAvail
      });
      showToast(`${worker.full_name} availability updated`, 'success');
      fetchWorkers();
    } catch (e) {
      showToast('Failed to update worker availability', 'error');
    }
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.password) {
      showToast('Full name, email, and password are required', 'warning');
      return;
    }
    if (formData.password.length < 8) {
      showToast('Password must be at least 8 characters long', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim() || null,
        employee_id: formData.employee_id.trim() || null,
        zone: formData.zone,
        specialization: formData.specialization,
        department: formData.department,
        max_active_tasks: parseInt(formData.max_active_tasks, 10) || 5
      };

      await api.post('/workers/register', payload);
      showToast(
        `Technician ${formData.full_name} registered successfully! They can now log in to the Worker Portal.`,
        'success'
      );
      setShowAddModal(false);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        employee_id: '',
        zone: 'Central',
        specialization: 'Pipe Leak Repair',
        department: 'Water Operations',
        max_active_tasks: 5
      });
      fetchWorkers();
    } catch (err) {
      showToast(err.message || 'Failed to register field worker', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = workers.filter((w) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      w.full_name.toLowerCase().includes(q) ||
      w.email.toLowerCase().includes(q) ||
      w.worker_profile?.employee_id?.toLowerCase().includes(q) ||
      w.worker_profile?.zone?.toLowerCase().includes(q) ||
      w.worker_profile?.specialization?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-title">
          <h2>Field Maintenance Staff & Technicians</h2>
          <p>Register authorized workers directly into database, monitor availability, and configure zonal assignments.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <UserPlus size={18} /> Register New Worker
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search technician, zone, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.2rem' }}
            />
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 11 }} />
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            Total Registered Technicians: <span style={{ color: '#0284c7' }}>{workers.length}</span>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <LoadingSpinner text="Retrieving field staff directory from database..." />
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
              <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#475569' }}>No field technicians found</div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                Use the "Register New Worker" button above to authorize a technician.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Technician Name</th>
                    <th>Email Address</th>
                    <th>Zone</th>
                    <th>Specialization</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th>Availability Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((w) => {
                    const prof = w.worker_profile;
                    const isAvail = prof?.is_available ?? true;

                    return (
                      <tr key={w.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                          {prof?.employee_id || 'WKR-000'}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{w.full_name}</div>
                          {w.phone && (
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>📞 {w.phone}</div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#475569', fontFamily: 'monospace' }}>
                            {w.email}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-gray">{prof?.zone || 'Central'}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>
                            {prof?.specialization || 'General Plumbing'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>
                            {prof?.max_active_tasks || 5} tasks
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isAvail ? 'badge-green' : 'badge-red'}`}>
                            {isAvail ? 'Available' : 'Off Duty'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleAvailability(w)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.78rem' }}
                          >
                            {isAvail ? 'Mark Off-Duty' : 'Mark Available'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Worker Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>
                  Register Field Worker (Direct DB Provisioning)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddWorker} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. ramesh.wkr@waterwatch.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Initial Password (Min 8 chars) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter initial password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Employee ID (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. WKR-2026-05"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Assigned Zone
                  </label>
                  <select
                    className="form-control"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  >
                    <option value="Central">Central Sector</option>
                    <option value="North">North Sector</option>
                    <option value="South">South Sector</option>
                    <option value="East">East Sector</option>
                    <option value="West">West Sector</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Specialization
                  </label>
                  <select
                    className="form-control"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  >
                    <option value="Pipe Leak Repair">Pipe Leak Repair</option>
                    <option value="Mainline Bursts">Mainline Bursts</option>
                    <option value="Hydrant & Valve Maintenance">Hydrant & Valve Maintenance</option>
                    <option value="Pressure Regulators & Metering">Pressure Regulators & Metering</option>
                    <option value="Reservoir & Overflow Control">Reservoir & Overflow Control</option>
                    <option value="General Plumbing">General Plumbing</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Max Concurrent Tasks
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="form-control"
                    value={formData.max_active_tasks}
                    onChange={(e) => setFormData({ ...formData, max_active_tasks: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#166534' }}>
                🛡️ <b>Access Guarantee:</b> This technician will be provisioned directly into the database with <code>role: worker</code>. They can sign in at the login screen using this email and password to enter the Worker Portal. Unauthorized non-workers cannot enter.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? 'Registering into Database...' : 'Register Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
