import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, FileText, CheckCircle, Clock, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NearbyReportsMap from '../../components/maps/NearbyReportsMap';
import { formatDate, getCategoryLabel } from '../../utils/formatters';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [nearbyReports, setNearbyReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const userLat = user?.citizen_profile?.latitude || 12.9716;
  const userLng = user?.citizen_profile?.longitude || 77.5946;

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [myReps, nearby] = await Promise.all([
          reportService.getMyReports(),
          reportService.getNearbyReports(userLat, userLng, 5.0)
        ]);
        setReports(myReps || []);
        setNearbyReports(nearby || []);
      } catch (e) {
        console.error('Failed to load citizen dashboard', e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [userLat, userLng]);

  if (loading) return <LoadingSpinner text="Loading your water dashboard..." />;

  const submittedCount = reports.filter((r) => r.status === 'submitted' || r.status === 'under_review').length;
  const activeCount = reports.filter((r) => r.status === 'linked').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

  return (
    <div>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          color: 'white',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.3)'
        }}
      >
        <div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#bae6fd' }}>
            Community Water Watch
          </span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>
            Hello, {user?.full_name}!
          </h2>
          <p style={{ color: '#e0f2fe', fontSize: '0.92rem', maxWidth: '520px', marginTop: '0.3rem' }}>
            Help protect our local water resources. Report bursts, overflowing mains, or low pressure in seconds.
          </p>
        </div>

        <Link
          to="/citizen/new-report"
          className="btn"
          style={{
            backgroundColor: 'white',
            color: '#0369a1',
            padding: '0.75rem 1.4rem',
            fontSize: '0.95rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <PlusCircle size={20} /> Report a Water Problem
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard
          label="My Total Reports"
          value={reports.length}
          subtext="Submitted by you"
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="Pending Review"
          value={submittedCount}
          subtext="Under municipal assessment"
          icon={Clock}
          color="yellow"
        />
        <StatCard
          label="Active Repairs"
          value={activeCount}
          subtext="Crew mobilized on-site"
          icon={AlertCircle}
          color="blue"
        />
        <StatCard
          label="Resolved & Verified"
          value={resolvedCount}
          subtext="Successfully repaired"
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Map & Recent Reports Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.75rem' }}>
        {/* Nearby Reports Map */}
        <div className="card">
          <div className="card-header">
            <h3>Nearby Community Incidents</h3>
            <Link to="/citizen/nearby" style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              Full Map <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <NearbyReportsMap
              userLat={userLat}
              userLng={userLng}
              radiusKm={5.0}
              reports={nearbyReports}
              height="360px"
            />
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="card">
          <div className="card-header">
            <h3>My Recent Reports</h3>
            <Link to="/citizen/my-reports" style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              View All ({reports.length}) <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {reports.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>You haven't submitted any water reports yet.</p>
                <Link to="/citizen/new-report" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                  Submit Your First Report
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {reports.slice(0, 5).map((rep) => (
                  <Link
                    key={rep.id}
                    to={`/citizen/reports/${rep.id}`}
                    style={{
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                          {rep.report_number}
                        </span>
                        <StatusBadge status={rep.status} />
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginTop: 4 }}>
                        {rep.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                        {getCategoryLabel(rep.category)} • 📍 {rep.address_text}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {formatDate(rep.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

