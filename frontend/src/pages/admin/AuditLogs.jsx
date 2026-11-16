import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getAuditLogs({
        action: actionFilter || undefined,
        limit: 100
      });
      setLogs(data || []);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      (l.user_name && l.user_name.toLowerCase().includes(q)) ||
      (l.entity_id && l.entity_id.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Immutable System Audit Trail</h2>
          <p>Complete record of report creations, incident linking, worker dispatches, and verification decisions.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search action or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.2rem' }}
            />
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 11 }} />
          </div>

          <select
            className="form-control"
            style={{ width: '240px' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="CREATE_REPORT">CREATE_REPORT</option>
            <option value="CREATE_INCIDENT">CREATE_INCIDENT</option>
            <option value="LINK_REPORT_TO_INCIDENT">LINK_REPORT_TO_INCIDENT</option>
            <option value="ASSIGN_WORKER">ASSIGN_WORKER</option>
            <option value="VERIFY_RESOLUTION">VERIFY_RESOLUTION</option>
            <option value="REJECT_RESOLUTION">REJECT_RESOLUTION</option>
            <option value="AI_ANALYSIS_COMPLETED">AI_ANALYSIS_COMPLETED</option>
          </select>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <LoadingSpinner text="Retrieving audit records..." />
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              No audit log entries found matching criteria.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Entity Reference</th>
                    <th>Audit Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(l.created_at)}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {l.user_name || 'System AI'}
                      </td>
                      <td>
                        <span className="badge badge-gray">{l.user_role || 'system'}</span>
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {l.action}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {l.entity_type}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#0284c7' }}>
                        {l.entity_id ? l.entity_id.substring(0, 13) + '...' : '—'}
                      </td>
                      <td>
                        <div style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569' }}>
                          {JSON.stringify(l.new_values || l.old_values || {})}
                        </div>
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

