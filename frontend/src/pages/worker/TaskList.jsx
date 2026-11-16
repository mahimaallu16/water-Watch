import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Search, Clock, ArrowRight, MapPin } from 'lucide-react';
import { workerService } from '../../services/workerService';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

export default function TaskList() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await workerService.getMyAssignments();
      setAssignments(data || []);
    } catch (e) {
      console.error('Failed to load assignments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filtered = assignments.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.incident_number?.toLowerCase().includes(q) ||
        a.incident_title?.toLowerCase().includes(q) ||
        a.incident_address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>My Assigned Incidents & Work Orders</h2>
          <p>Accept dispatches, mobilize to site, capture repair evidence, and submit for verification.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'white',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'assigned', 'in_progress', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="btn btn-sm"
              style={{
                backgroundColor: statusFilter === st ? '#0284c7' : '#f8fafc',
                color: statusFilter === st ? 'white' : '#475569',
                borderColor: statusFilter === st ? '#0284c7' : '#e2e8f0',
                textTransform: 'capitalize'
              }}
            >
              {st === 'all' ? 'All Assigned' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search work order or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', paddingBottom: '0.45rem', paddingTop: '0.45rem' }}
          />
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <LoadingSpinner text="Retrieving assignment queue..." />
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
              No tasks found matching your filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7', fontSize: '0.85rem' }}>
                        {a.incident_number}
                      </span>
                      <StatusBadge status={a.status} type="incident" />
                      <PriorityBadge priority={a.priority} />
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                      {a.incident_title}
                    </h4>

                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                      📍 {a.incident_address}
                    </div>

                    {a.instructions && (
                      <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 6, background: '#f8fafc', padding: '0.4rem 0.65rem', borderRadius: 6 }}>
                        <b>Instructions:</b> {a.instructions}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Assigned: {formatDate(a.assigned_at)}
                    </span>
                    <Link to={`/worker/tasks/${a.id}`} className="btn btn-primary btn-sm">
                      Open Job Details <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

