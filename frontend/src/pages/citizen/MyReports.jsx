import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Filter, Droplet, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { reportService } from '../../services/reportService';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, getCategoryLabel, getFlowLabel } from '../../utils/formatters';

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchReports() {
      try {
        const data = await reportService.getMyReports();
        setReports(data || []);
      } catch (e) {
        console.error('Failed to fetch user reports', e);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  if (loading) return <LoadingSpinner text="Retrieving your report history..." />;

  const filtered = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.report_number.toLowerCase().includes(q) ||
        r.address_text.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>My Submitted Reports</h2>
          <p>Track investigation status, linked municipal incidents, and repair progress.</p>
        </div>
        <Link to="/citizen/new-report" className="btn btn-primary">
          <PlusCircle size={18} /> New Report
        </Link>
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
          {['all', 'submitted', 'under_review', 'linked', 'resolved'].map((st) => (
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
              {st === 'all' ? 'All Submissions' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search report number or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.2rem', paddingBottom: '0.45rem', paddingTop: '0.45rem' }}
          />
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
          <Droplet size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>No reports found</h3>
          <p style={{ fontSize: '0.88rem', marginTop: 4 }}>
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or status filter.'
              : 'You have not submitted any water problem reports yet.'}
          </p>
          <Link to="/citizen/new-report" className="btn btn-primary btn-sm" style={{ marginTop: '1.25rem' }}>
            Report a Problem Now
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((rep) => {
            const hasPhoto = rep.images && rep.images.length > 0;
            const primaryImg = hasPhoto ? rep.images[0].image_url : null;

            return (
              <div
                key={rep.id}
                className="card"
                style={{
                  marginBottom: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: '1.25rem',
                  gap: '1.25rem',
                  flexWrap: 'wrap'
                }}
              >
                {/* Photo Thumbnail */}
                <div
                  style={{
                    width: 90,
                    height: 80,
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e2e8f0',
                    flexShrink: 0
                  }}
                >
                  {primaryImg ? (
                    <img
                      src={primaryImg}
                      alt="Leak"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Droplet size={28} color="#94a3b8" />
                  )}
                </div>

                {/* Report Info */}
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>
                      {rep.report_number}
                    </span>
                    <StatusBadge status={rep.status} />
                    {rep.linked_incident_number && (
                      <span className="badge badge-purple">
                        Linked: {rep.linked_incident_number}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    {rep.title}
                  </h3>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                    <span>{getCategoryLabel(rep.category)}</span>
                    <span>•</span>
                    <span>Flow: {getFlowLabel(rep.estimated_flow)}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={13} /> {rep.address_text}
                    </span>
                  </div>
                </div>

                {/* Right Action */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {formatDate(rep.created_at)}
                  </span>
                  <Link to={`/citizen/reports/${rep.id}`} className="btn btn-secondary btn-sm">
                    View Progress <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

