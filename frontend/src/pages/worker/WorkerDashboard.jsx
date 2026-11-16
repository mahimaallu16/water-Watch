import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, CheckCircle, Clock, AlertTriangle, MapPin, ArrowRight } from 'lucide-react';
import { workerService } from '../../services/workerService';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import IncidentMap from '../../components/maps/IncidentMap';
import { formatDate } from '../../utils/formatters';

export default function WorkerDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [assignList, statsData] = await Promise.all([
          workerService.getMyAssignments(),
          workerService.getMyStats()
        ]);
        setAssignments(assignList || []);
        setStats(statsData);
      } catch (e) {
        console.error('Failed to load field worker dashboard', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <LoadingSpinner text="Retrieving field assignments..." />;

  const activeAssignments = assignments.filter((a) =>
    ['assigned', 'accepted', 'in_progress', 'rework_required'].includes(a.status)
  );

  const mapIncidents = activeAssignments.map((a) => ({
    id: a.incident_id,
    incident_number: a.incident_number,
    title: a.incident_title,
    category: a.incident_category,
    severity: a.incident_severity,
    status: a.status,
    latitude: a.incident_latitude,
    longitude: a.incident_longitude,
    address_text: a.incident_address
  }));

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Field Technician Dispatch Workspace</h2>
          <p>Assigned repair tasks, job navigation, photographic evidence upload, and completion verification.</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard
          label="Active Jobs"
          value={activeAssignments.length}
          subtext="Requiring action"
          icon={Wrench}
          color="blue"
        />
        <StatCard
          label="Completed Jobs"
          value={stats?.completed_jobs || 0}
          subtext="Lifetime repairs"
          icon={Clock}
          color="yellow"
        />
        <StatCard
          label="Verified Resolved"
          value={stats?.verified_resolved_jobs || 0}
          subtext="Inspected by admin"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Assigned Sector"
          value={`${stats?.zone || 'Central'} Zone`}
          subtext={stats?.specialization || 'General Plumbing'}
          icon={MapPin}
          color="blue"
        />
      </div>

      {/* Map of Active Assignments */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h3>Active Job Locations Map</h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Click pin to view incident address and coordinates
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <IncidentMap
            items={mapIncidents}
            itemType="incident"
            height="380px"
          />
        </div>
      </div>

      {/* Active Work Orders List */}
      <div className="card">
        <div className="card-header">
          <h3>Current Assigned Tasks ({activeAssignments.length})</h3>
          <Link to="/worker/tasks" style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            All Tasks <ArrowRight size={14} />
          </Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {activeAssignments.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
              <CheckCircle size={40} color="#16a34a" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>All tasks completed!</h3>
              <p style={{ fontSize: '0.88rem', marginTop: 4 }}>You have no open work orders pending action.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activeAssignments.map((a) => (
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
                      <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 6, fontStyle: 'italic', background: '#f8fafc', padding: '0.4rem 0.65rem', borderRadius: 6 }}>
                        Instructions: {a.instructions}
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

