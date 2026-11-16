import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Award, Eye, Clock } from 'lucide-react';
import { workerService } from '../../services/workerService';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

export default function WorkerHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await workerService.getMyAssignments();
        // Filter completed or resolved tasks
        const past = data.filter((a) => a.status === 'completed' || a.incident_status === 'resolved');
        setHistory(past);
      } catch (e) {
        console.error('Failed to load history', e);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  if (loading) return <LoadingSpinner text="Loading completed job history..." />;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Completed Work Orders & History</h2>
          <p>Review your verified repair records, evidence photographs, and supervisor approvals.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {history.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
              <Clock size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>No completed history yet</h3>
              <p style={{ fontSize: '0.88rem', marginTop: 4 }}>Completed work orders will appear here once verified.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Incident Ref</th>
                    <th>Job Title & Location</th>
                    <th>Category</th>
                    <th>Assigned Date</th>
                    <th>Completed Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>
                        {h.incident_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{h.incident_title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>📍 {h.incident_address}</div>
                      </td>
                      <td>
                        <span className="badge badge-gray">{h.incident_category}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {formatDate(h.assigned_at)}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                        {formatDate(h.completed_at)}
                      </td>
                      <td>
                        <StatusBadge status={h.status} type="incident" />
                      </td>
                      <td>
                        <Link to={`/worker/tasks/${h.id}`} className="btn btn-secondary btn-sm">
                          <Eye size={14} /> View Details
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

