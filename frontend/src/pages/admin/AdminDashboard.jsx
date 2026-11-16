import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Copy,
  Users,
  MapPin,
  TrendingUp,
  Plus,
  ArrowRight
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { incidentService } from '../../services/incidentService';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import IncidentMap from '../../components/maps/IncidentMap';
import CategoryPieChart from '../../components/charts/CategoryPieChart';
import TrendLineChart from '../../components/charts/TrendLineChart';
import PriorityBarChart from '../../components/charts/PriorityBarChart';
import { formatRelativeTime } from '../../utils/formatters';

export default function AdminDashboard() {
  const [kpis, setKpis] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [kpiData, incList] = await Promise.all([
          analyticsService.getDashboardKPIs(),
          incidentService.getIncidents({ limit: 50 })
        ]);
        setKpis(kpiData);
        setIncidents(incList || []);
      } catch (e) {
        console.error('Failed to load admin dashboard data', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <LoadingSpinner text="Compiling operational water analytics..." />;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Water Infrastructure Command Center</h2>
          <p>Real-time telemetry, citizen reporting queue, incident lifecycle, and AI duplicate tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/admin/incidents" className="btn btn-primary">
            <Plus size={18} /> Create Incident
          </Link>
          <Link to="/admin/duplicates" className="btn btn-secondary">
            <Copy size={18} /> Duplicates Queue ({kpis?.duplicate_candidates_count || 0})
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Citizen Reports"
          value={kpis?.total_reports || 0}
          subtext="Logged in system"
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="Pending Review"
          value={kpis?.pending_reviews || 0}
          subtext="Awaiting verification"
          icon={Clock}
          color="yellow"
        />
        <StatCard
          label="Active Incidents"
          value={kpis?.active_incidents || 0}
          subtext={`${kpis?.critical_incidents || 0} Critical Priority`}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          label="Resolved Cases"
          value={kpis?.resolved_incidents || 0}
          subtext={`Avg fix time: ${kpis?.average_resolution_hours || 0} hrs`}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Interactive GIS Incident Map */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div>
            <h3>Geospatial Incident & Problem Distribution</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Color-coded by severity: Red = Critical (P1), Orange = High (P2), Yellow = Medium (P3), Blue = Low (P4)
            </span>
          </div>
          <Link to="/admin/map" style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Explore Full Map <ArrowRight size={14} />
          </Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <IncidentMap
            items={incidents}
            itemType="incident"
            height="420px"
          />
        </div>
      </div>

      {/* Operational Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Reports by Category */}
        <div className="card">
          <div className="card-header">
            <h3>Defects by Category</h3>
          </div>
          <div className="card-body">
            <CategoryPieChart data={kpis?.reports_by_category || []} />
          </div>
        </div>

        {/* 14-Day Trends */}
        <div className="card">
          <div className="card-header">
            <h3>14-Day Inflow vs Resolution Trend</h3>
          </div>
          <div className="card-body">
            <TrendLineChart data={kpis?.trends || []} />
          </div>
        </div>

        {/* Incidents by Severity */}
        <div className="card">
          <div className="card-header">
            <h3>Incidents by Severity</h3>
          </div>
          <div className="card-body">
            <PriorityBarChart data={kpis?.incidents_by_severity || []} />
          </div>
        </div>
      </div>

      {/* Recent System Activity / Audit Log */}
      <div className="card">
        <div className="card-header">
          <h3>Real-Time Audit Trail & Operational Events</h3>
          <Link to="/admin/audit" style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            View Complete Logs <ArrowRight size={14} />
          </Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity Reference</th>
                </tr>
              </thead>
              <tbody>
                {kpis?.recent_activity?.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                      No recent audit events
                    </td>
                  </tr>
                ) : (
                  kpis?.recent_activity?.map((act) => (
                    <tr key={act.id}>
                      <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatRelativeTime(act.timestamp)}
                      </td>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>
                        {act.actor}
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                          {act.action}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {act.entity_type}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#0284c7' }}>
                        {act.entity_id ? act.entity_id.substring(0, 13) + '...' : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

