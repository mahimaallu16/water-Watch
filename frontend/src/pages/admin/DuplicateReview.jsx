import React, { useState, useEffect } from 'react';
import { Copy, AlertCircle, CheckCircle2, XCircle, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDistance, formatDate } from '../../utils/formatters';

export default function DuplicateReview() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const { showToast } = useToast();

  const loadDuplicates = async () => {
    setLoading(true);
    try {
      const data = await aiService.getDuplicateCandidates(null, 'detected');
      setCandidates(data || []);
    } catch (e) {
      console.error('Failed to load duplicate queue', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDuplicates();
  }, []);

  const handleReview = async (candidateId, status, linkToIncident = false) => {
    setProcessingId(candidateId);
    try {
      await aiService.reviewDuplicate(candidateId, status, linkToIncident);
      showToast(
        status === 'confirmed_duplicate'
          ? 'Confirmed duplicate pair!'
          : 'Candidate pair dismissed.',
        'success'
      );
      loadDuplicates();
    } catch (e) {
      showToast('Failed to review duplicate candidate', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Potential Duplicate Reports Review</h2>
          <p>
            AI compares location distance, time elapsed, problem category, and vocabulary overlap.
            Duplicates are never automatically deleted or merged without human review.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Scanning duplicate candidates..." />
      ) : candidates.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
          <CheckCircle2 size={42} color="#16a34a" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>No pending duplicate candidates</h3>
          <p style={{ fontSize: '0.88rem', marginTop: 4 }}>
            All incoming water reports have distinct geographic signatures or have already been reviewed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {candidates.map((cand) => (
            <div key={cand.id} className="card" style={{ marginBottom: 0 }}>
              <div
                className="card-header"
                style={{
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Copy size={18} color="#0284c7" />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                    Match Confidence: {Math.round(cand.similarity_score * 100)}%
                  </span>
                  <span className="badge badge-yellow">
                    Distance: {formatDistance(cand.distance_meters)}
                  </span>
                  <span className="badge badge-blue">
                    Time Gap: {cand.time_diff_hours} hrs
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleReview(cand.id, 'confirmed_duplicate', true)}
                    className="btn btn-sm btn-primary"
                    disabled={processingId === cand.id}
                  >
                    <CheckCircle2 size={14} /> Confirm Duplicate & Link
                  </button>
                  <button
                    onClick={() => handleReview(cand.id, 'dismissed', false)}
                    className="btn btn-sm btn-secondary"
                    disabled={processingId === cand.id}
                  >
                    <XCircle size={14} /> Dismiss (Distinct Issues)
                  </button>
                </div>
              </div>

              <div className="card-body">
                {/* Side by Side Comparison Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '1.5rem'
                  }}
                >
                  {/* Left: Incoming Report */}
                  <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>
                        NEW: {cand.report_number}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {formatDate(cand.created_at)}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.4rem' }}>
                      {cand.report_title}
                    </h4>

                    <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 4 }}>
                      📍 {cand.report_address}
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <span className="badge badge-gray">{cand.report_category}</span>
                    </div>
                  </div>

                  {/* Right: Existing Reference Report */}
                  <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0369a1', fontFamily: 'monospace' }}>
                        EXISTING: {cand.potential_report_number}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Reference Case
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.4rem' }}>
                      {cand.potential_report_title}
                    </h4>

                    <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 4 }}>
                      📍 {cand.potential_report_address}
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <span className="badge badge-gray">{cand.potential_report_category}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

