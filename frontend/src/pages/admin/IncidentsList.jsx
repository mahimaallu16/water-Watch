import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, AlertTriangle, Layers } from 'lucide-react';
import { incidentService } from '../../services/incidentService';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import { ZONES } from '../../utils/constants';

export default function IncidentsList() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [search, setSearch] = useState('');

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('pipe_leak');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState('medium');
  const [newPriority, setNewPriority] = useState('p3');
  const [newZone, setNewZone] = useState('Central');
  const [newAddress, setNewAddress] = useState('Grand Central Ave');
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await incidentService.getIncidents({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        zone: zoneFilter || undefined
      });
      setIncidents(data || []);
    } catch (e) {
      console.error('Failed to load incidents', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, severityFilter, zoneFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await incidentService.createIncident({
        title: newTitle,
        category: newCategory,
        description: newDesc,
        severity: newSeverity,
        priority: newPriority,
        latitude: 12.9716,
        longitude: 77.5946,
        address_text: newAddress,
        zone: newZone
      });
      showToast(`Incident ${created.incident_number} opened successfully!`, 'success');
      setShowModal(false);
      setNewTitle('');
      setNewDesc('');
      fetchIncidents();
    } catch (err) {
      showToast(err.message || 'Failed to create incident', 'error');
    } finally {
      setCreating(false);
    }
  };

  const filtered = incidents.filter((inc) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inc.incident_number.toLowerCase().includes(q) ||
      inc.title.toLowerCase().includes(q) ||
      inc.address_text.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Water Infrastructure Incidents</h2>
          <p>Active maintenance incidents, field assignments, repair progress, and verification approvals.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} /> Open New Incident
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'white',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search incident number, title, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem' }}
          />
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 11 }} />
        </div>

        <select
          className="form-control"
          style={{ width: '180px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="investigating">Investigating</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="work_submitted">Work Submitted</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          className="form-control"
          style={{ width: '160px' }}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          className="form-control"
          style={{ width: '150px' }}
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
        >
          <option value="">All Zones</option>
          {ZONES.map((z) => (
            <option key={z} value={z}>{z} Zone</option>
          ))}
        </select>
      </div>

      {/* Incidents Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <LoadingSpinner text="Retrieving active incidents..." />
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
              No incidents match the selected filter criteria.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Incident Ref</th>
                    <th>Title & Location</th>
                    <th>Zone</th>
                    <th>Severity / Priority</th>
                    <th>Status</th>
                    <th>Assigned Worker</th>
                    <th>Linked Reports</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inc) => (
                    <tr key={inc.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>
                        {inc.incident_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{inc.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>📍 {inc.address_text}</div>
                      </td>
                      <td>
                        <span className="badge badge-gray">{inc.zone}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <PriorityBadge severity={inc.severity} />
                          <PriorityBadge priority={inc.priority} />
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={inc.status} type="incident" />
                      </td>
                      <td>
                        {inc.active_worker_name ? (
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                            {inc.active_worker_name}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-purple" style={{ minWidth: 28, justifyContent: 'center' }}>
                          {inc.linked_reports_count}
                        </span>
                      </td>
                      <td>
                        <Link to={`/admin/incidents/${inc.id}`} className="btn btn-secondary btn-sm">
                          <Eye size={14} /> Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Incident Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Open Municipal Work Order Incident"
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Incident Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Main Distribution Pipe Crack"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Zone / Sector</label>
              <select
                className="form-control"
                value={newZone}
                onChange={(e) => setNewZone(e.target.value)}
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>{z} Zone</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                className="form-control"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="pipe_leak">Pipe Leak</option>
                <option value="overflow">Street Overflow</option>
                <option value="damaged_valve">Damaged Valve</option>
                <option value="low_pressure">Low Pressure</option>
                <option value="contamination">Water Quality / Contamination</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Severity</label>
              <select
                className="form-control"
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value)}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                className="form-control"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              >
                <option value="p1">P1 — Emergency (&lt; 4h)</option>
                <option value="p2">P2 — Urgent (&lt; 12h)</option>
                <option value="p3">P3 — Standard (&lt; 24h)</option>
                <option value="p4">P4 — Scheduled (&lt; 48h)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Street Address</label>
            <input
              type="text"
              className="form-control"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Work Order Scope & Instructions</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Outline repair expectations, pipe diameter, depth, or required excavation machinery..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem -1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Open Incident'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

