import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  Wrench,
  Navigation,
  FileCheck,
  Send,
  Plus
} from 'lucide-react';
import { workerService } from '../../services/workerService';
import { incidentService } from '../../services/incidentService';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';

export default function TaskDetail() {
  const { id } = useParams(); // assignment id
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [assignment, setAssignment] = useState(null);
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Progress Note Form
  const [updateType, setUpdateType] = useState('arrival');
  const [updateNotes, setUpdateNotes] = useState('');

  // Evidence Upload Form
  const [evidenceType, setEvidenceType] = useState('before');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);

  // Completion Form
  const [completionNotes, setCompletionNotes] = useState('');

  const loadData = async () => {
    try {
      const myAssignments = await workerService.getMyAssignments();
      const current = myAssignments.find((a) => a.id === id);
      if (!current) {
        showToast('Assignment not found in your queue', 'error');
        setLoading(false);
        return;
      }
      setAssignment(current);

      if (current.incident_id) {
        const inc = await incidentService.getIncidentById(current.incident_id);
        setIncident(inc);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load task details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      await workerService.acceptAssignment(id);
      showToast('Assignment accepted! Status set to In Progress.', 'success');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to accept assignment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!updateNotes.trim()) return;
    setSubmitting(true);
    try {
      await workerService.addRepairUpdate(id, updateType, updateNotes);
      showToast('Progress update posted!', 'success');
      setShowUpdateModal(false);
      setUpdateNotes('');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to post update', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceFile) {
      showToast('Please select an evidence photograph', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('evidence_type', evidenceType);
      formData.append('image', evidenceFile);
      if (evidenceNotes) formData.append('notes', evidenceNotes);
      if (materialsUsed) formData.append('materials_used', materialsUsed);

      await workerService.uploadEvidence(id, formData);
      showToast('Repair evidence photograph uploaded!', 'success');
      setShowEvidenceModal(false);
      setEvidenceFile(null);
      setEvidenceNotes('');
      setMaterialsUsed('');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to upload evidence', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    if (!assignment.evidence || assignment.evidence.length === 0) {
      showToast('You must upload at least one repair evidence photograph before submitting.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await workerService.submitCompletion(id, completionNotes);
      showToast('Work submitted successfully! Administrator notified for verification.', 'success');
      setShowCompleteModal(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to submit work', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving task details..." />;
  if (!assignment) return <div style={{ padding: '2rem' }}>Task not found.</div>;

  const isAssigned = assignment.status === 'assigned';
  const isInProgress = assignment.status === 'in_progress' || assignment.status === 'accepted' || assignment.status === 'rework_required';
  const isCompleted = assignment.status === 'completed';

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/worker/tasks" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0284c7', fontSize: '0.9rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to My Tasks
        </Link>
      </div>

      {/* Task Header */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>
                {assignment.incident_number}
              </span>
              <StatusBadge status={assignment.status} type="incident" />
              <PriorityBadge priority={assignment.priority} />
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '0.4rem' }}>
              {assignment.incident_title}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.88rem', marginTop: '0.35rem' }}>
              <MapPin size={15} /> {assignment.incident_address}
            </div>
          </div>

          {/* Workflow Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isAssigned && (
              <button
                onClick={handleAccept}
                className="btn btn-primary"
                disabled={submitting}
              >
                <CheckCircle2 size={16} /> Accept & Begin Mobilization
              </button>
            )}

            {isInProgress && (
              <>
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="btn btn-secondary"
                >
                  <Clock size={16} /> Post Progress Update
                </button>
                <button
                  onClick={() => setShowEvidenceModal(true)}
                  className="btn btn-secondary"
                >
                  <Camera size={16} /> Upload Photo Evidence
                </button>
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="btn btn-success"
                >
                  <FileCheck size={16} /> Submit Work for Verification
                </button>
              </>
            )}

            {isCompleted && (
              <span className="badge badge-purple" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Awaiting Administrator Quality Verification
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Details, Instructions & Evidence */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Left Column: Scope, Location & Updates */}
        <div>
          {/* Dispatcher Instructions */}
          <div className="card">
            <div className="card-header">
              <h3>Dispatcher Work Order Instructions</h3>
            </div>
            <div className="card-body">
              <p style={{ color: '#1e293b', fontSize: '0.92rem', lineHeight: 1.5, background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {assignment.instructions || 'Standard repair procedure. Contact central dispatch for valve isolation codes.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    GPS Coordinates
                  </span>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#1e293b' }}>
                    {assignment.incident_latitude ? `${assignment.incident_latitude.toFixed(5)}, ${assignment.incident_longitude.toFixed(5)}` : 'On record'}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Assigned By
                  </span>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{assignment.assigner_name || 'Central Dispatch'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Notes Log */}
          <div className="card">
            <div className="card-header">
              <h3>Progress & Status Notes ({assignment.updates?.length || 0})</h3>
              {isInProgress && (
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus size={14} /> Add Note
                </button>
              )}
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {assignment.updates?.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No progress updates logged yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {assignment.updates.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        padding: '0.85rem 1.25rem',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                          {u.update_type.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {formatDate(u.timestamp)}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: '#334155', marginTop: 4 }}>
                        {u.notes}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Repair Evidence Gallery */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3>Repair Evidence Photographs ({assignment.evidence?.length || 0})</h3>
              {isInProgress && (
                <button
                  onClick={() => setShowEvidenceModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Camera size={14} /> Upload Evidence
                </button>
              )}
            </div>
            <div className="card-body">
              {assignment.evidence?.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  <Camera size={36} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>No repair photographs uploaded yet</p>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                    Please upload before, in-progress, and after repair photographs to verify work quality.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                  {assignment.evidence.map((ev) => (
                    <div key={ev.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <a href={ev.image_url} target="_blank" rel="noreferrer" style={{ display: 'block', height: 110, overflow: 'hidden' }}>
                        <img src={ev.image_url} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <div style={{ padding: '0.5rem', background: '#f8fafc' }}>
                        <span className="badge badge-blue" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>
                          {ev.evidence_type} Repair
                        </span>
                        {ev.materials_used && (
                          <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600, marginTop: 3 }}>
                            Parts: {ev.materials_used}
                          </div>
                        )}
                        {ev.notes && (
                          <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 3 }}>
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
        </div>
      </div>

      {/* Modal: Post Progress Update */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Post Status / Progress Note"
      >
        <form onSubmit={handlePostUpdate}>
          <div className="form-group">
            <label>Update Type</label>
            <select
              className="form-control"
              value={updateType}
              onChange={(e) => setUpdateType(e.target.value)}
            >
              <option value="arrival">On Site / Arrival Notice</option>
              <option value="status_change">Progress Update</option>
              <option value="parts_requested">Parts / Equipment Requested</option>
              <option value="delay_notice">Delay / Obstacle Notice</option>
            </select>
          </div>

          <div className="form-group">
            <label>Progress Notes *</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. Arrived on site with repair crew, valve isolated, excavation started."
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem -1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowUpdateModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Posting...' : 'Save Update'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Upload Evidence */}
      <Modal
        isOpen={showEvidenceModal}
        onClose={() => setShowEvidenceModal(false)}
        title="Upload Photographic Repair Evidence"
      >
        <form onSubmit={handleUploadEvidence}>
          <div className="form-group">
            <label>Evidence Phase *</label>
            <select
              className="form-control"
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
            >
              <option value="before">Before Repair (Damage View)</option>
              <option value="in_progress">In-Progress (Installation / Weld)</option>
              <option value="after">After Repair (Restored / Tested)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Select Photograph *</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="form-control"
              onChange={(e) => setEvidenceFile(e.target.files[0])}
              required
            />
          </div>

          <div className="form-group">
            <label>Materials & Parts Used</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 12-inch stainless clamp, rubber flange gasket"
              value={materialsUsed}
              onChange={(e) => setMaterialsUsed(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Field Notes</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="e.g. Replaced cracked section, pressure tested to 50 PSI with zero leakage."
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem -1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowEvidenceModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Uploading...' : 'Upload Evidence'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Submit Work for Verification */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Submit Work for Administrator Verification"
      >
        <form onSubmit={handleSubmitCompletion}>
          <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '1rem' }}>
            Submitting completed work will change status to <b>Work Submitted</b> and notify municipal administrators to inspect the photographic evidence and mark the incident resolved.
          </p>

          <div className="form-group">
            <label>Completion Notes</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. All pipeline repairs complete, site backfilled, water pressure fully restored to normal."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem -1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCompleteModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Confirm Completion'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

