import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, AlertCircle, Upload, CheckCircle2, X } from 'lucide-react';
import { reportService } from '../../services/reportService';
import { useToast } from '../../context/ToastContext';
import LocationPicker from '../../components/maps/LocationPicker';
import { PROBLEM_CATEGORIES, FLOW_RATES } from '../../utils/constants';

export default function NewReport() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('pipe_leak');
  const [description, setDescription] = useState('');
  const [estimatedFlow, setEstimatedFlow] = useState('moderate_stream');
  const [affectedHouseholds, setAffectedHouseholds] = useState(1);
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [addressText, setAddressText] = useState('');
  const [landmark, setLandmark] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Validate size and format
    const validFiles = [];
    const validPreviews = [];

    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast(`Skipped ${file.name}: only JPG, PNG, and WebP are supported`, 'warning');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast(`Skipped ${file.name}: exceeds 10MB limit`, 'warning');
        continue;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    setSelectedImages((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...validPreviews]);
  };

  const handleRemoveImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !addressText.trim()) {
      showToast('Please fill in all required fields (title, description, location).', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('estimated_flow', estimatedFlow);
      formData.append('affected_households', affectedHouseholds);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('address_text', addressText);
      if (landmark) formData.append('landmark', landmark);

      // Append photographs
      selectedImages.forEach((file) => {
        formData.append('images', file);
      });

      const result = await reportService.submitReport(formData);
      showToast(`Report ${result.report_number} submitted! AI analysis initiated.`, 'success');
      navigate(`/citizen/reports/${result.id}`);
    } catch (err) {
      showToast(err.message || 'Failed to submit report. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">
          <h2>Report a Water Infrastructure Problem</h2>
          <p>Provide details and photographs. AI will automatically inspect the report and alert maintenance teams.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-body">
          {/* Section 1: Issue Classification */}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            1. Problem Category & Description
          </h3>

          <div className="form-group">
            <label>Report Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Broken water pipeline leaking onto road"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label>Suspected Issue Type *</label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {PROBLEM_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Estimated Flow / Leak Intensity</label>
              <select
                className="form-control"
                value={estimatedFlow}
                onChange={(e) => setEstimatedFlow(e.target.value)}
              >
                {FLOW_RATES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Detailed Description *</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Describe what you see: is water bubbling from pavement, overflowing a drainage ditch, discolored, or hissing from a valve box?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label>Estimated Households Affected</label>
            <input
              type="number"
              min={1}
              max={5000}
              className="form-control"
              value={affectedHouseholds}
              onChange={(e) => setAffectedHouseholds(parseInt(e.target.value) || 1)}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1.75rem 0' }} />

          {/* Section 2: Photographs */}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            2. Upload Photographs <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>(AI image classification will inspect this)</span>
          </h3>

          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '1.75rem',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
            onClick={() => document.getElementById('report-photo-input').click()}
          >
            <Camera size={36} color="#0284c7" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>
              Click to browse or take photos of the leak
            </p>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
              Supports JPG, PNG, WEBP (Max 10MB per file)
            </p>
            <input
              id="report-photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </div>

          {previewUrls.length > 0 && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {previewUrls.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    width: 90,
                    height: 90,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  <img src={url} alt="Leak preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1.75rem 0' }} />

          {/* Section 3: Location */}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            3. Pinpoint Exact Location
          </h3>

          <div style={{ marginBottom: '1.25rem' }}>
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              onChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              height="300px"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label>Street Address / Locality *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 5th Avenue & Market Street"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Nearby Landmark (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. In front of City Library or Bus Stop #4"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '1.25rem 1.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/citizen')}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Submitting & Running AI Analysis...' : 'Submit Water Report'}
          </button>
        </div>
      </form>
    </div>
  );
}

