import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, AlertCircle, Droplet, ArrowRight } from 'lucide-react';
import { reportService } from '../../services/reportService';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, getCategoryLabel, getFlowLabel } from '../../utils/formatters';
import { PROBLEM_CATEGORIES } from '../../utils/constants';

export default function ReportsQueue() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportService.getReports({
        status: statusFilter || undefined,
        category: categoryFilter || undefined
      });
      setReports(data || []);
    } catch (e) {
      console.error('Failed to load reports queue', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, categoryFilter]);

  const filtered = reports.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.report_number.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.citizen_name.toLowerCase().includes(q) ||
      r.address_text.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Citizen Incident Reports Queue</h2>
          <p>Review incoming resident reports, inspect AI suggestions, and create or link field incidents.</p>
        </div>
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
            placeholder="Search report number, address, or citizen..."
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
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="linked">Linked to Incident</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          className="form-control"
          style={{ width: '220px' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {PROBLEM_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Reports Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <LoadingSpinner text="Loading report entries..." />
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              No citizen reports match your query filters.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report Ref</th>
                    <th>Resident</th>
                    <th>Problem Details</th>
                    <th>Category & Flow</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>
                        {r.report_number}
                      </td>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>
                        {r.citizen_name || 'Resident'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>📍 {r.address_text}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{getCategoryLabel(r.category)}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{getFlowLabel(r.estimated_flow)}</div>
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                        {r.linked_incident_number && (
                          <div style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600, marginTop: 2 }}>
                            {r.linked_incident_number}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(r.created_at)}
                      </td>
                      <td>
                        <Link to={`/admin/reports/${r.id}`} className="btn btn-secondary btn-sm">
                          <Eye size={14} /> Review & AI
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
    </div>
  );
}

