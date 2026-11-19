import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  AlertTriangle,
  Link as LinkIcon,
  PlusCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  Sparkles,
  Camera,
  Layers,
  Star
} from 'lucide-react';
import { reportService } from '../../services/reportService';
import { aiService } from '../../services/aiService';
import { incidentService } from '../../services/incidentService';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { formatDate, getCategoryLabel, getFlowLabel } from '../../utils/formatters';
import { ZONES, SEVERITY_LEVELS, PRIORITY_LEVELS } from '../../utils/constants';

export default function ReportReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [report, setReport] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [openIncidents, setOpenIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Create Incident Form
  const [incTitle, setIncTitle] = useState('');
  const [incCategory, setIncCategory] = useState('');
  const [incSeverity, setIncSeverity] = useState('medium');
  const [incPriority, setIncPriority] = useState('p3');
  const [incZone, setIncZone] = useState('Central');

  // Link Incident Form
  const [selectedIncidentId, setSelectedIncidentId] = useState('');

  const loadData = async () => {
    try {
      const [rep, suggs, incs] = await Promise.all([
        reportService.getReportById(id),
        aiService.getSuggestions(id),
        incidentService.getIncidents({ status: 'investigating' })
      ]);
      setReport(rep);
      setAiSuggestions(suggs || []);
      setOpenIncidents(incs || []);

      if (rep) {
        setIncTitle(`Water Infrastructure Defect - ${rep.title}`);
        setIncCategory(rep.category);
      }
    } catch (e) {
      showToast('Failed to load report for review', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleReviewAiSuggestion = async (suggId, reviewStatus) => {
    try {
      await aiService.reviewSuggestion(suggId, reviewStatus, 'Reviewed by administrator');
      showToast(`AI suggestion marked as ${reviewStatus}`, 'success');
      loadData();
    } catch (e) {
      showToast('Failed to update AI suggestion', 'error');
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newInc = await incidentService.createIncident({
        title: incTitle,
        category: incCategory,
        description: `Created from citizen report ${report.report_number}. Description: ${report.description}`,
        severity: incSeverity,
        priority: incPriority,
        latitude: report.latitude,
        longitude: report.longitude,
        address_text: report.address_text,
        zone: incZone,
        initial_report_id: report.id
      });
      showToast(`Incident ${newInc.incident_number} successfully opened!`, 'success');
      setShowCreateModal(false);
      navigate(`/admin/incidents/${newInc.id}`);
    } catch (err) {
      showToast(err.message || 'Failed to create incident', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkToIncident = async (e) => {
    e.preventDefault();
    if (!selectedIncidentId) {
      showToast('Please choose an incident to link', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await incidentService.linkReport(selectedIncidentId, report.id, 'Linked via admin review');
      showToast('Report linked to incident successfully!', 'success');
      setShowLinkModal(false);
      navigate(`/admin/incidents/${selectedIncidentId}`);
    } catch (err) {
      showToast(err.message || 'Failed to link report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading report review..." />;
  if (!report) return <div style={{ padding: '2rem' }}>Report not found.</div>;

  // Extract AI Priority and Category Suggestions
  const prioritySugg = aiSuggestions.find((s) => s.suggestion_type === 'priority');
  const categorySugg = aiSuggestions.find((s) => s.suggestion_type === 'category');
  const duplicateSuggs = aiSuggestions.filter((s) => s.suggestion_type === 'duplicate');

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/admin/reports" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0284c7', fontSize: '0.9rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Reports Queue
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>
                {report.report_number}
              </span>
              <StatusBadge status={report.status} />
              {report.linked_incident_number && (
                <span className="badge badge-purple">
                  Linked Incident: {report.linked_incident_number}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '0.4rem' }}>
              {report.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem' }}>
              <MapPin size={15} /> {report.address_text}
              {report.landmark && <span>• Landmark: {report.landmark}</span>}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {!report.linked_incident_id && (
              <>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  <PlusCircle size={16} /> Create Work Order Incident
                </button>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="btn btn-secondary"
                >
                  <LinkIcon size={16} /> Link to Existing Incident
                </button>
              </>
            )}
            {report.linked_incident_id && (
              <Link to={`/admin/incidents/${report.linked_incident_id}`} className="btn btn-secondary">
                <Layers size={16} /> View Incident Details
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Grid: AI Analysis Intelligence & Citizen Report Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Left: AI & Intelligence Analysis Box */}
        <div>
          <div
            className="card"
            style={{
              background: 'linear-gradient(to bottom right, #f8fafc, #f0fdf4)',
              border: '1px solid #86efac'
            }}
          >
            <div className="card-header" style={{ borderBottomColor: '#bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="#16a34a" />
              <h3 style={{ color: '#166534' }}>AI Automated Intelligence Analysis</h3>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '1.25rem' }}>
                AI model evaluated uploaded photograph, reported flow, and spatial proximity to generate recommendations.
              </p>

              {/* Priority & Severity Recommendation */}
              {prioritySugg && (
                <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                      Recommended Priority & Urgency
                    </span>
                    <span className="badge badge-red" style={{ textTransform: 'uppercase' }}>
                      Urgency Score: {prioritySugg.suggested_value.urgency_score} / 100
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <PriorityBadge severity={prioritySugg.suggested_value.recommended_severity} />
                    <PriorityBadge priority={prioritySugg.suggested_value.recommended_priority} />
                  </div>

                  <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.5rem', lineHeight: 1.4 }}>
                    {prioritySugg.reasoning}
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Decision:</span>
                    <span className="badge badge-gray">{prioritySugg.review_status}</span>
                    {prioritySugg.review_status === 'pending' && (
                      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                        <button
                          onClick={() => handleReviewAiSuggestion(prioritySugg.id, 'accepted')}
                          className="btn btn-sm btn-success"
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleReviewAiSuggestion(prioritySugg.id, 'rejected')}
                          className="btn btn-sm btn-danger"
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        >
                          Override
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Image Category Suggestion */}
              {categorySugg && (
                <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                      PyTorch Image Category Classifier
                    </span>
                    <span className="badge badge-blue">
                      {Math.round(categorySugg.confidence_score * 100)}% Confidence
                    </span>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0284c7', marginTop: '0.4rem' }}>
                    Suggested: {getCategoryLabel(categorySugg.suggested_value.category)}
                  </div>

                  <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.35rem' }}>
                    {categorySugg.reasoning}
                  </p>

                  {categorySugg.suggested_value.detected_features && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {categorySugg.suggested_value.detected_features.map((feat, idx) => (
                        <span key={idx} className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                          {feat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Duplicate Candidates Alert */}
              {duplicateSuggs.length > 0 && (
                <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 700, fontSize: '0.85rem' }}>
                    <AlertTriangle size={16} /> Potential Duplicate Detected
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#78350f', marginTop: 4 }}>
                    This report has {duplicateSuggs.length} high-similarity duplicate candidate(s) close in location and time.
                  </p>
                  <Link
                    to="/admin/duplicates"
                    className="btn btn-sm"
                    style={{ backgroundColor: '#fef3c7', color: '#92400e', marginTop: '0.5rem', borderColor: '#fcd34d' }}
                  >
                    Compare in Duplicates Queue
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Resident Report Content */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3>Resident Submission Details</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Citizen Reporter
                  </span>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{report.citizen_name}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Flow Rate
                  </span>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{getFlowLabel(report.estimated_flow)}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Affected Homes
                  </span>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{report.affected_households} household(s)</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    GPS Coordinates
                  </span>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#1e293b' }}>
                    {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                  </p>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Citizen Description
                </span>
                <p style={{ color: '#334155', fontSize: '0.92rem', whiteSpace: 'pre-wrap', marginTop: 4, lineHeight: 1.5 }}>
                  {report.description}
                </p>
              </div>

              {/* Photographs Gallery */}
              <div style={{ marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Uploaded Photographs ({report.images?.length || 0})
                </span>
                {report.images && report.images.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {report.images.map((img) => (
                      <a
                        key={img.id}
                        href={img.image_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          width: 140,
                          height: 120,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          display: 'block'
                        }}
                      >
                        <img src={img.image_url} alt="Leak" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>No photographs uploaded.</p>
                )}
                {/* Citizen Satisfaction Feedback */}
                {report.feedback && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem' }}>
                      <Star size={18} fill="#eab308" color="#eab308" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>
                        Citizen Satisfaction Review
                      </span>
                    </div>

                    <div style={{ background: '#fefce8', padding: '1rem', borderRadius: '8px', border: '1px solid #fef08a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={18}
                            fill={s <= report.feedback.rating ? '#eab308' : 'none'}
                            color={s <= report.feedback.rating ? '#eab308' : '#cbd5e1'}
                          />
                        ))}
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#854d0e', marginLeft: 6 }}>
                          {report.feedback.rating} / 5 Stars
                        </span>
                        {report.feedback.satisfaction_category && (
                          <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', marginLeft: 8 }}>
                            {report.feedback.satisfaction_category}
                          </span>
                        )}
                      </div>

                      {report.feedback.comments && (
                        <p style={{ fontSize: '0.88rem', color: '#334155', marginTop: '0.5rem', fontStyle: 'italic', lineHeight: 1.4 }}>
                          "{report.feedback.comments}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create Work Order Incident */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Work Order Incident"
      >
        <form onSubmit={handleCreateIncident}>
          <div className="form-group">
            <label>Incident Title *</label>
            <input
              type="text"
              className="form-control"
              value={incTitle}
              onChange={(e) => setIncTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Zone / Sector</label>
              <select
                className="form-control"
                value={incZone}
                onChange={(e) => setIncZone(e.target.value)}
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>{z} Zone</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                className="form-control"
                value={incCategory}
                onChange={(e) => setIncCategory(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Severity Level</label>
              <select
                className="form-control"
                value={incSeverity}
                onChange={(e) => setIncSeverity(e.target.value)}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label>Response Priority</label>
              <select
                className="form-control"
                value={incPriority}
                onChange={(e) => setIncPriority(e.target.value)}
              >
                <option value="p1">P1 — Emergency (&lt; 4h)</option>
                <option value="p2">P2 — Urgent (&lt; 12h)</option>
                <option value="p3">P3 — Standard (&lt; 24h)</option>
                <option value="p4">P4 — Scheduled (&lt; 48h)</option>
              </select>
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem -1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating Incident...' : 'Confirm & Open Incident'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Link to Existing Incident */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        title="Link to Existing Active Incident"
      >
        <form onSubmit={handleLinkToIncident}>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1rem' }}>
            Select an active municipal incident to associate this citizen report with. Multiple reports can belong to one incident.
          </p>

          <div className="form-group">
            <label>Select Active Incident *</label>
            <select
              className="form-control"
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              required
            >
              <option value="">-- Choose an open incident --</option>
              {openIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.incident_number} — {inc.title} ({inc.zone} Zone)
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem -1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowLinkModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Linking...' : 'Confirm & Link'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

