import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, CheckCircle, Clock, Award, ShieldCheck } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CategoryPieChart from '../../components/charts/CategoryPieChart';
import TrendLineChart from '../../components/charts/TrendLineChart';
import PriorityBarChart from '../../components/charts/PriorityBarChart';

export default function Analytics() {
  const [kpis, setKpis] = useState(null);
  const [workerMetrics, setWorkerMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dash, workers] = await Promise.all([
          analyticsService.getDashboardKPIs(),
          analyticsService.getWorkerAnalytics()
        ]);
        setKpis(dash);
        setWorkerMetrics(workers || []);
      } catch (e) {
        console.error('Failed to load operational analytics', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <LoadingSpinner text="Crunching infrastructure analytics..." />;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Operational Analytics & Performance Metrics</h2>
          <p>Service level agreement (SLA) turnaround times, MTTR, defect classifications, and worker verification rates.</p>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="stats-grid">
        <StatCard
          label="Total Incident Inflow"
          value={kpis?.total_reports || 0}
          subtext="Lifetime citizen reports"
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          label="Mean Time To Resolve (MTTR)"
          value={`${kpis?.average_resolution_hours || 0} hrs`}
          subtext="From dispatch to closure"
          icon={Clock}
          color="yellow"
        />
        <StatCard
          label="Resolved Cases"
          value={kpis?.resolved_incidents || 0}
          subtext="Verified by administration"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Active Emergencies"
          value={kpis?.critical_incidents || 0}
          subtext="P1 / Critical priority"
          icon={TrendingUp}
          color="red"
        />
      </div>

      {/* Visual Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>Defect Classification Distribution</h3>
          </div>
          <div className="card-body">
            <CategoryPieChart data={kpis?.reports_by_category || []} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>14-Day Repair vs Inflow Cadence</h3>
          </div>
          <div className="card-body">
            <TrendLineChart data={kpis?.trends || []} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Active Incidents by Severity Tier</h3>
          </div>
          <div className="card-body">
            <PriorityBarChart data={kpis?.incidents_by_severity || []} />
          </div>
        </div>
      </div>

      {/* Field Worker Performance Leaderboard */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={20} color="#0284c7" />
            <h3>Field Technician Performance & Verification Approval Rates</h3>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Technician</th>
                  <th>Zone</th>
                  <th>Specialization</th>
                  <th>Completed Tasks</th>
                  <th>Active Load</th>
                  <th>Avg Resolution Time</th>
                  <th>Verification Approval Rate</th>
                </tr>
              </thead>
              <tbody>
                {workerMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                      No worker performance records logged yet.
                    </td>
                  </tr>
                ) : (
                  workerMetrics.map((w) => (
                    <tr key={w.worker_id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                        {w.employee_id}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {w.worker_name}
                      </td>
                      <td>
                        <span className="badge badge-gray">{w.zone}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {w.specialization}
                      </td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>
                        {w.completed_tasks} jobs
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {w.active_tasks} active
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {w.avg_resolution_hours} hrs
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: w.verification_rate >= 80 ? '#16a34a' : '#d97706' }}>
                            {w.verification_rate}%
                          </span>
                          <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                            Quality Verified
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Incidents by Zone Breakdown */}
      <div className="card">
        <div className="card-header">
          <h3>Geographic Zone Incident Inflow vs Resolution Rate</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Municipal Zone</th>
                  <th>Total Incidents</th>
                  <th>Resolved Cases</th>
                  <th>Resolution Percentage</th>
                </tr>
              </thead>
              <tbody>
                {kpis?.incidents_by_zone?.map((z) => {
                  const pct = z.incident_count > 0 ? Math.round((z.resolved_count / z.incident_count) * 100) : 0;
                  return (
                    <tr key={z.zone}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{z.zone} Zone</td>
                      <td style={{ fontWeight: 600 }}>{z.incident_count}</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>{z.resolved_count}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ flex: 1, maxWidth: 160, height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#0284c7' }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

