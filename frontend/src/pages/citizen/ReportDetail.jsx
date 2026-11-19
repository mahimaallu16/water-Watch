import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Camera, AlertCircle, CheckCircle2, Send, Droplet, Star, ThumbsUp, MessageSquare, Edit3 } from 'lucide-react';
import { reportService } from '../../services/reportService';
import { analyticsService } from '../../services/analyticsService';
import { feedbackService } from '../../services/feedbackService';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, getCategoryLabel, getFlowLabel } from '../../utils/formatters';

export default function ReportDetail() {
  const { id } = useParams();
  const { showToast } = useToast();

  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Additional evidence form
  const [extraNotes, setExtraNotes] = useState('');
  const [extraPhotos, setExtraPhotos] = useState([]);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  // Citizen Feedback & Rating state
  const [feedback, setFeedback] = useState(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [satisfactionCategory, setSatisfactionCategory] = useState('High Quality Repair');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchDetails = async () => {
    try {
      const [rep, hist, fb] = await Promise.all([
        reportService.getReportById(id),
        analyticsService.getStatusHistory('report', id),
        feedbackService.getFeedback(id).catch(() => null)
      ]);
      setReport(rep);
      setHistory(hist || []);

      const activeFb = fb || rep?.feedback;
      if (activeFb) {
        setFeedback(activeFb);
        setRating(activeFb.rating || 5);
        setSatisfactionCategory(activeFb.satisfaction_category || 'High Quality Repair');
        setFeedbackComments(activeFb.comments || '');
      }
    } catch (e) {
      showToast('Failed to load report details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleEvidenceSubmit = async (e) => {
    e.preventDefault();
    if (!extraNotes && extraPhotos.length === 0) {
      showToast('Please provide notes or upload a photo', 'warning');
      return;
    }

    setSubmittingEvidence(true);
    try {
      const formData = new FormData();
      if (extraNotes) formData.append('notes', extraNotes);
      extraPhotos.forEach((file) => formData.append('images', file));

      await reportService.submitAdditionalEvidence(id, formData);
      showToast('Additional evidence submitted successfully!', 'success');
      setExtraNotes('');
      setExtraPhotos([]);
      fetchDetails();
    } catch (err) {
      showToast(err.message || 'Failed to submit additional evidence', 'error');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      const saved = await feedbackService.submitFeedback(id, {
        rating,
        satisfaction_category: satisfactionCategory,
        comments: feedbackComments
      });
      setFeedback(saved);
      setIsEditingFeedback(false);
      showToast('Thank you! Your feedback has been recorded.', 'success');
      fetchDetails();
    } catch (err) {
      showToast(err.message || 'Failed to submit rating', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const SATISFACTION_TAGS = [
    'Fast Response',
    'Clean Worksite',
    'High Quality Repair',
    'Clear Communication',
    'Delayed Repair',
    'Issue Persists'
  ];

  const RATING_LABELS = {
    1: '1 Star — Very Dissatisfied',
    2: '2 Stars — Dissatisfied',
    3: '3 Stars — Acceptable / Neutral',
    4: '4 Stars — Satisfied',
    5: '5 Stars — Excellent Service'
  };

  if (loading) return <LoadingSpinner text="Retrieving report details..." />;
  if (!report) return <div style={{ padding: '2rem', textAlign: 'center' }}>Report not found.</div>;

  // Stepper stages
  const stages = [
    { key: 'submitted', label: 'Report Submitted' },
    { key: 'under_review', label: 'Assessed by Admin' },
    { key: 'linked', label: 'Linked to Work Order' },
    { key: 'resolved', label: 'Repair Verified & Closed' }
  ];

  const getStageStatus = (stageKey) => {
    if (report.status === 'resolved') return 'completed';
    if (report.status === stageKey) return 'current';
    if (stageKey === 'submitted') return 'completed';
    if (stageKey === 'under_review' && (report.status === 'linked' || report.status === 'resolved')) return 'completed';
    if (stageKey === 'linked' && report.status === 'resolved') return 'completed';
    return 'pending';
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/citizen/my-reports" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0284c7', fontSize: '0.9rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to My Reports
        </Link>
      </div>

      {/* Header Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>
                {report.report_number}
              </span>
              <StatusBadge status={report.status} />
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '0.4rem' }}>
              {report.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem' }}>
              <MapPin size={15} /> {report.address_text}
              {report.landmark && <span>({report.landmark})</span>}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Submitted On</span>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
              {formatDate(report.created_at)}
            </div>
          </div>
        </div>

        {/* Visual Progress Stepper */}
        <div
          style={{
            marginTop: '2rem',
            padding: '1.25rem',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {stages.map((stage, idx) => {
              const stageState = getStageStatus(stage.key);
              const isCompleted = stageState === 'completed';
              const isCurrent = stageState === 'current';

              return (
                <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 2 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? '#22c55e' : isCurrent ? '#0284c7' : '#e2e8f0',
                      color: isCompleted || isCurrent ? 'white' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      boxShadow: isCurrent ? '0 0 0 4px rgba(2, 132, 199, 0.2)' : 'none'
                    }}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#0284c7' : isCompleted ? '#166534' : '#64748b',
                      marginTop: 6,
                      textAlign: 'center'
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Left Column: Details & Photos */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3>Problem Details</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Category
                  </span>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{getCategoryLabel(report.category)}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Flow Intensity
                  </span>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{getFlowLabel(report.estimated_flow)}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Households Impacted
                  </span>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{report.affected_households} household(s)</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    GPS Coordinates
                  </span>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#1e293b' }}>
                    {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                  </p>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Description
                </span>
                <p style={{ color: '#334155', fontSize: '0.92rem', whiteSpace: 'pre-wrap', marginTop: 4, lineHeight: 1.5 }}>
                  {report.description}
                </p>
              </div>

              {/* Photographs */}
              <div style={{ marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Photographic Evidence ({report.images?.length || 0})
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
                          width: 110,
                          height: 100,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #e2e8f0',
                          display: 'block'
                        }}
                      >
                        <img src={img.image_url} alt="Leak" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>No photographs uploaded with initial report.</p>
                )}
              </div>
            </div>
          </div>

          {/* Citizen Feedback & Satisfaction Card (Visible when report is resolved, or if already submitted) */}
          {(report.status === 'resolved' || feedback) && (
            <div
              className="card"
              style={{
                border: '1px solid #fef08a',
                background: 'linear-gradient(to bottom right, #ffffff, #fefce8)'
              }}
            >
              <div
                className="card-header"
                style={{
                  borderBottomColor: '#fef08a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={18} fill="#eab308" color="#eab308" />
                  <h3 style={{ color: '#854d0e', margin: 0 }}>Citizen Satisfaction & Repair Review</h3>
                </div>
                {feedback && !isEditingFeedback && (
                  <button
                    type="button"
                    onClick={() => setIsEditingFeedback(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem' }}
                  >
                    <Edit3 size={13} /> Edit Review
                  </button>
                )}
              </div>

              <div className="card-body">
                {feedback && !isEditingFeedback ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={24}
                          fill={star <= feedback.rating ? '#eab308' : 'none'}
                          color={star <= feedback.rating ? '#eab308' : '#cbd5e1'}
                        />
                      ))}
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#854d0e', marginLeft: 8 }}>
                        {RATING_LABELS[feedback.rating] || `${feedback.rating} / 5 Stars`}
                      </span>
                    </div>

                    {feedback.satisfaction_category && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            fontWeight: 600
                          }}
                        >
                          <ThumbsUp size={12} style={{ marginRight: 4 }} />
                          {feedback.satisfaction_category}
                        </span>
                      </div>
                    )}

                    {feedback.comments && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          background: '#ffffff',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid #fef08a',
                          color: '#334155',
                          fontSize: '0.9rem',
                          lineHeight: 1.5
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>
                          <MessageSquare size={13} /> Your Feedback Notes:
                        </div>
                        {feedback.comments}
                      </div>
                    )}

                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Submitted {formatDate(feedback.created_at)}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                      The repair work order for this water report has been completed. How satisfied are you with the resolution?
                    </p>

                    {/* Interactive Star Picker */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                        Overall Satisfaction Rating:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 2
                            }}
                          >
                            <Star
                              size={28}
                              fill={star <= (hoverRating || rating) ? '#eab308' : 'none'}
                              color={star <= (hoverRating || rating) ? '#eab308' : '#cbd5e1'}
                            />
                          </button>
                        ))}
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#854d0e', marginLeft: 8 }}>
                          {RATING_LABELS[hoverRating || rating]}
                        </span>
                      </div>
                    </div>

                    {/* Satisfaction Category Chips */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                        What stood out most?
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {SATISFACTION_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setSatisfactionCategory(tag)}
                            style={{
                              padding: '0.3rem 0.75rem',
                              fontSize: '0.8rem',
                              borderRadius: '20px',
                              border: satisfactionCategory === tag ? '1px solid #ca8a04' : '1px solid #e2e8f0',
                              backgroundColor: satisfactionCategory === tag ? '#fef08a' : '#ffffff',
                              color: satisfactionCategory === tag ? '#854d0e' : '#475569',
                              fontWeight: satisfactionCategory === tag ? 700 : 500,
                              cursor: 'pointer'
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional Comment textarea */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                        Comments or Suggestions (Optional):
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Tell the municipal maintenance team how the repair went..."
                        value={feedbackComments}
                        onChange={(e) => setFeedbackComments(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {isEditingFeedback && (
                        <button
                          type="button"
                          onClick={() => setIsEditingFeedback(false)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={submittingFeedback}
                      >
                        <Send size={14} /> {submittingFeedback ? 'Submitting...' : (feedback ? 'Update Review' : 'Submit Rating')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Submit Additional Evidence Box */}
          <div className="card">
            <div className="card-header">
              <h3>Submit Additional Evidence / Update</h3>
            </div>
            <form onSubmit={handleEvidenceSubmit} className="card-body">
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                Has the leak gotten worse? Upload recent photos or describe changes for the maintenance crew.
              </p>

              <div className="form-group">
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Provide additional details or observations..."
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  id="add-photo"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => setExtraPhotos(Array.from(e.target.files))}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('add-photo').click()}
                  className="btn btn-secondary btn-sm"
                >
                  <Camera size={14} /> Attach Photos ({extraPhotos.length})
                </button>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submittingEvidence}
                >
                  <Send size={14} /> {submittingEvidence ? 'Sending...' : 'Post Update'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Status History & Incident Link */}
        <div>
          {/* Linked Incident Card */}
          {report.linked_incident_id && (
            <div
              className="card"
              style={{
                background: 'linear-gradient(to bottom right, #f8fafc, #f0f9ff)',
                borderColor: '#bae6fd'
              }}
            >
              <div className="card-header" style={{ borderBottomColor: '#e0f2fe' }}>
                <h3 style={{ color: '#0369a1' }}>Municipal Work Order Link</h3>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '0.85rem', color: '#334155' }}>
                  This report has been reviewed and grouped under active municipal repair incident:
                </p>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0284c7', margin: '0.5rem 0' }}>
                  {report.linked_incident_number}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Repair Status:</span>
                  <span className="badge badge-indigo" style={{ textTransform: 'capitalize' }}>
                    {report.linked_incident_status?.replace('_', ' ') || 'In Progress'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status Timeline History */}
          <div className="card">
            <div className="card-header">
              <h3>Status History & Audit Trail</h3>
            </div>
            <div className="card-body">
              {history.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No status changes recorded yet.</p>
              ) : (
                <div className="timeline">
                  {history.map((h) => (
                    <div key={h.id} className="timeline-item">
                      <div className="timeline-point" />
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                            {h.new_status.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {formatDate(h.created_at)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                          {h.notes || `Status transitioned by ${h.actor_name || 'System'}`}
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
    </div>
  );
}

