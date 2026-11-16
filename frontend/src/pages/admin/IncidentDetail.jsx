import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Wrench,
  CheckCircle2,
  XCircle,
  UserCheck,
  MapPin,
  Clock,
  Sparkles,
  Camera,
  Layers,
  Link as LinkIcon,
  ShieldCheck
} from 'lucide-react';
import { incidentService } from '../../services/incidentService';
import { aiService } from '../../services/aiService';
import { reportService } from '../../services/reportService';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { formatDate, getCategoryLabel } from '../../utils/formatters';

export default function IncidentDetail() {
  const { id } = useParams();
  const { showToast } = useToast();

  const [incident, setIncident] = useState(null);
  const [recommendedWorkers, setRecommendedWorkers] = useState([]);
  const [unlinkedReports, setUnlinkedReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assign Worker Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignPriority, setAssignPriority] = useState('p2');

  // Verify Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyApproved, setVerifyApproved] = useState(true);
  const [verifyFeedback, setVerifyFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Link Report Modal
  const [showLinkReportModal, setShowLinkReportModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');

  const loadData = async () => {
    try {
      const [inc, recWorkers, reps] = await Promise.all([
        incidentService.getIncidentById(id),
        aiService.getRecommendedWorkers(id),
        reportService.getReports({ status: 'submitted' })
      ]);
      setIncident(inc);
      setRecommendedWorkers(recWorkers || []);
      setUnlinkedReports(reps || []);
      if (recWorkers && recWorkers.length > 0) {
        setSelectedWorkerId(recWorkers[0].worker_id);
      }
    } catch (e) {
      showToast('Failed to load incident details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAssignWorker = async (e) => {
    e.preventDefault();
    if (!selectedWorkerId) {
      showToast('Please select a technician', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await incidentService.assignWorker(id, selectedWorkerId, assignInstructions, assignPriority);
      showToast('Technician assigned successfully! Dispatched alert sent.', 'success');
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to assign worker', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyResolution = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await incidentService.verifyResolution(id, verifyApproved, verifyFeedback);
      showToast(
        verifyApproved
          ? 'Resolution verified! Incident marked resolved and citizens notified.'
          : 'Resolution rejected. Rework requested from technician.',
        'success'
      );
      setShowVerifyModal(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to verify resolution', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkReport = async (e) => {
    e.preventDefault();
    if (!selectedReportId) return;
    setSubmitting(true);
    try {
      await incidentService.linkReport(id, selectedReportId, 'Manually linked by administrator');
      showToast('Report linked to incident successfully!', 'success');
      setShowLinkReportModal(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to link report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving incident data & AI recommendation..." />;
  if (!incident) return <div style={{ padding: '2rem' }}>Incident not found.</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/admin/incidents" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0284c7', fontSize: '0.9rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Incidents List
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>
                {incident.incident_number}
              </span>
              <StatusBadge status={incident.status} type="incident" />
              <PriorityBadge severity={incident.severity} />
              <PriorityBadge priority={incident.priority} />
              <span className="badge badge-gray">{incident.zone} Zone</span>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.4rem' }}>
              {incident.title}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.88rem', marginTop: '0.35rem' }}>
              <MapPin size={15} /> {incident.address_text}
            </div>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {incident.status === 'investigating' && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="btn btn-primary"
              >
                <Wrench size={16} /> Assign Field Technician
              </button>
            )}

            {incident.status === 'work_submitted' && (
              <button
                onClick={() => {
                  setVerifyApproved(true);
                  setShowVerifyModal(true);
                }}
                className="btn btn-success"
              >
                <ShieldCheck size={16} /> Verify & Approve Resolution
              </button>
            )}

            <button
              onClick={() => setShowLinkReportModal(true)}
              className="btn btn-secondary"
            >
              <LinkIcon size={16} /> Link Another Report
            </button>
          </div>
        </div>
      </div>

      {/* Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Left: Work Details, Assigned Worker, and AI Recommendation */}
        <div>
          {/* Active Worker Assignment Info */}
          <div className="card">
            <div className="card-header">
              <h3>Field Worker Assignment</h3>
              {incident.status !== 'investigating' && incident.status !== 'resolved' && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="btn btn-secondary btn-sm"
                >
                  Reassign
                </button>
              )}
            </div>
            <div className="card-body">
              {incident.active_worker_name ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700
                      }}
                    >
                      {incident.active_worker_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        {incident.active_worker_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Assigned Maintenance Technician
                      </div>
                    </div>
                  </div>

                  {incident.assignments && incident.assignments.length > 0 && (
                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: '#475569' }}>Dispatcher Instructions: </span>
                      <span style={{ color: '#1e293b' }}>{incident.assignments[0].instructions || 'Standard repair procedure.'}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>
                    No technician currently assigned to this incident.
                  </p>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.75rem' }}
                  >
                    <UserCheck size={15} /> Select Technician
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Worker Recommendation Ranking Card */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(to bottom right, #f8fafc, #f0fdf4)',
              border: '1px solid #86efac'
            }}
          >
            <div className="card-header" style={{ borderBottomColor: '#bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#16a34a" />
              <h3 style={{ color: '#166534' }}>AI Worker Recommendations</h3>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.75rem' }}>
                Workers ranked by zone proximity ({incident.zone}), specialization match, and current active workload.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recommendedWorkers.slice(0, 3).map((w, idx) => (
                  <div
                    key={w.worker_id}
                    style={{
                      background: 'white',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                          {w.worker_name}
                        </span>
                        <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                          {w.match_score}% Match
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                        {w.reasoning}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedWorkerId(w.worker_id);
                        setShowAssignModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Dispatch
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Linked Citizen Reports */}
          <div className="card">
            <div className="card-header">
              <h3>Linked Citizen Reports ({incident.linked_reports?.length || 0})</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {incident.linked_reports?.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No citizen reports linked to this incident.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {incident.linked_reports.map((rep) => (
                    <div
                      key={rep.id}
                      style={{
                        padding: '0.85rem 1.25rem',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7', fontSize: '0.8rem' }}>
                            {rep.report_number}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                            {rep.title}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                          Reported by {rep.citizen_name} • 📍 {rep.address_text}
                        </div>
                      </div>

                      <Link to={`/admin/reports/${rep.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Repair Evidence, Verification, and Status History */}
        <div>
          {/* Repair Evidence Photographs */}
          <div className="card">
            <div className="card-header">
              <h3>Repair Evidence & Completion Photographs</h3>
            </div>
            <div className="card-body">
              {incident.evidence?.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No repair photographs uploaded yet. Technician will submit before/after photographs upon completion.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                  {incident.evidence.map((ev) => (
                    <div key={ev.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <a href={ev.image_url} target="_blank" rel="noreferrer" style={{ display: 'block', height: 110, overflow: 'hidden' }}>
                        <img src={ev.image_url} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <div style={{ padding: '0.5rem', background: '#f8fafc' }}>
                        <span className="badge badge-blue" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>
                          {ev.evidence_type} Repair
                        </span>
                        {ev.notes && (
                          <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 4, lineHeight: 1.3 }}>
                            {ev.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Verification Panel */}
          {incident.status === 'work_submitted' && (
            <div className="card" style={{ border: '2px solid #22c55e', backgroundColor: '#f0fdf4' }}>
              <div className="card-header" style={{ borderBottomColor: '#bbf7d0' }}>
                <h3 style={{ color: '#166534' }}>Field Work Verification Required</h3>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '0.88rem', color: '#166534', marginBottom: '1rem' }}>
                  The maintenance technician has submitted completion evidence. Review photographs above and verify resolution.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => {
                      setVerifyApproved(true);
                      setShowVerifyModal(true);
                    }}
                    className="btn btn-success"
                  >
                    <CheckCircle2 size={16} /> Approve & Mark Resolved
                  </button>
                  <button
                    onClick={() => {
                      setVerifyApproved(false);
                      setShowVerifyModal(true);
                    }}
                    className="btn btn-danger"
                  >
                    <XCircle size={16} /> Reject / Request Rework
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Full Audit / Status History */}
          <div className="card">
            <div className="card-header">
              <h3>Incident Audit & Status History</h3>
            </div>
            <div className="card-body">
              {incident.status_history?.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No history records.</p>
              ) : (
                <div className="timeline">
                  {incident.status_history.map((sh) => (
                    <div key={sh.id} className="timeline-item">
                      <div className="timeline-point" />
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                            {sh.new_status.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {formatDate(sh.created_at)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                          {sh.notes || `Updated by ${sh.actor_name || 'System'}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Assign Worker */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Field Maintenance Technician"
      >
        <form onSubmit={handleAssignWorker}>
          <div className="form-group">
            <label>Select Technician *</label>
            <select
              className="form-control"
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              required
            >
              {recommendedWorkers.map((w) => (
                <option key={w.worker_id} value={w.worker_id}>
                  {w.worker_name} ({w.employee_id}) — {w.match_score}% Match • {w.active_tasks} active tasks
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select
              className="form-control"
              value={assignPriority}
              onChange={(e) => setAssignPriority(e.target.value)}
            >
              <option value="p1">P1 — Emergency (&lt; 4h)</option>
              <option value="p2">P2 — Urgent (&lt; 12h)</option>
              <option value="p3">P3 — Standard (&lt; 24h)</option>
              <option value="p4">P4 — Scheduled (&lt; 48h)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Technician Instructions & Scope</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. Isolate shutoff valve 12B, replace cracked 4-inch ductile iron collar, test pressure."
              value={assignInstructions}
              onChange={(e) => setAssignInstructions(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem -1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAssignModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Dispatching...' : 'Dispatch Technician'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Verify Resolution */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title={verifyApproved ? 'Verify & Approve Repair Resolution' : 'Reject Resolution / Request Rework'}
      >
        <form onSubmit={handleVerifyResolution}>
          <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '1rem' }}>
            {verifyApproved
              ? 'Approving resolution will mark this incident as Resolved, update all linked citizen reports to Resolved, and notify reporting residents.'
              : 'Rejecting will return the assignment to the technician in In Progress state with your rework notes.'}
          </p>

          <div className="form-group">
            <label>Feedback & Quality Notes</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder={verifyApproved ? 'e.g. Visual evidence reviewed; pressure restored to 55 PSI.' : 'Specify what was inadequate or requires further repair...'}
              value={verifyFeedback}
              onChange={(e) => setVerifyFeedback(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem -1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowVerifyModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={verifyApproved ? 'btn btn-success' : 'btn btn-danger'}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : verifyApproved ? 'Confirm Resolution' : 'Submit Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Link Another Report */}
      <Modal
        isOpen={showLinkReportModal}
        onClose={() => setShowLinkReportModal(false)}
        title="Link Citizen Report to Incident"
      >
        <form onSubmit={handleLinkReport}>
          <div className="form-group">
            <label>Select Unlinked Citizen Report</label>
            <select
              className="form-control"
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              required
            >
              <option value="">-- Choose unlinked report --</option>
              {unlinkedReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.report_number} — {r.title} ({r.address_text})
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem -1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowLinkReportModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Linking...' : 'Link to Incident'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

