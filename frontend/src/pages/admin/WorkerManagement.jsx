import React, { useState, useEffect } from 'react';
import { Users, Wrench, Shield, CheckCircle, XCircle, Search } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function WorkerManagement() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

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
      <div className="page-header">
        <div className="page-title">
          <h2>Field Maintenance Staff & Technicians</h2>
          <p>Monitor technician dispatch availability, active workload capacity, and zonal assignments.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
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
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <LoadingSpinner text="Retrieving field staff directory..." />
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              No field technicians found matching search.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Technician Name</th>
                    <th>Zone</th>
                    <th>Specialization</th>
                    <th>Max Active Tasks</th>
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
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{w.email}</div>
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
    </div>
  );
}

