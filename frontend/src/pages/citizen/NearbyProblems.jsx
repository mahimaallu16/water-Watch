import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import NearbyReportsMap from '../../components/maps/NearbyReportsMap';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getCategoryLabel, formatDistance } from '../../utils/formatters';
import { MapPin, Filter, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NearbyProblems() {
  const { user } = useAuth();
  const [radiusKm, setRadiusKm] = useState(5.0);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const userLat = user?.citizen_profile?.latitude || 12.9716;
  const userLng = user?.citizen_profile?.longitude || 77.5946;

  useEffect(() => {
    async function fetchNearby() {
      setLoading(true);
      try {
        const data = await reportService.getNearbyReports(userLat, userLng, radiusKm);
        setReports(data || []);
      } catch (e) {
        console.error('Failed to load nearby reports', e);
      } finally {
        setLoading(false);
      }
    }
    fetchNearby();
  }, [radiusKm, userLat, userLng]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Nearby Water Problems Map</h2>
          <p>Explore reported leaks, overflow incidents, and repairs occurring in your vicinity.</p>
        </div>

        {/* Radius Filter Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Radius:</span>
          <input
            type="range"
            min={1}
            max={15}
            step={0.5}
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
            style={{ width: '120px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284c7', minWidth: '45px' }}>
            {radiusKm} km
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Interactive Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <NearbyReportsMap
            userLat={userLat}
            userLng={userLng}
            radiusKm={radiusKm}
            reports={reports}
            height="560px"
            onSelectReport={(rep) => setSelectedReport(rep)}
          />
        </div>

        {/* Nearby Reports Feed Sidebar */}
        <div className="card" style={{ maxHeight: '560px', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h3>Nearby Incidents ({reports.length})</h3>
          </div>
          <div className="card-body" style={{ padding: 0, flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <LoadingSpinner text="Scanning area..." />
            ) : reports.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                <p>No water issues reported within {radiusKm} km of your location.</p>
              </div>
            ) : (
              <div>
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      backgroundColor: selectedReport?.id === rep.id ? '#f0f9ff' : 'white',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                        {rep.report_number}
                      </span>
                      <StatusBadge status={rep.status} />
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', marginTop: 3 }}>
                      {rep.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                      {getCategoryLabel(rep.category)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: '0.75rem', color: '#94a3b8' }}>
                      <span>📍 {rep.address_text}</span>
                      <span style={{ color: '#0284c7', fontWeight: 700 }}>
                        {formatDistance(rep.distance_km * 1000)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

