import React, { useState, useEffect } from 'react';
import { incidentService } from '../../services/incidentService';
import { reportService } from '../../services/reportService';
import IncidentMap from '../../components/maps/IncidentMap';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Layers, AlertTriangle, Droplet } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MapExplorer() {
  const [incidents, setIncidents] = useState([]);
  const [reports, setReports] = useState([]);
  const [viewMode, setViewMode] = useState('incidents'); // 'incidents' or 'reports'
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    async function loadMapData() {
      try {
        const [incList, repList] = await Promise.all([
          incidentService.getIncidents({ limit: 100 }),
          reportService.getReports({ limit: 100 })
        ]);
        setIncidents(incList || []);
        setReports(repList || []);
      } catch (e) {
        console.error('Failed to load map explorer', e);
      } finally {
        setLoading(false);
      }
    }
    loadMapData();
  }, []);

  if (loading) return <LoadingSpinner text="Initializing geospatial infrastructure map..." />;

  const displayItems = viewMode === 'incidents' ? incidents : reports;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Geospatial Infrastructure Explorer</h2>
          <p>Interactive OpenStreetMap layer displaying water incidents, citizen report clusters, and repair assets.</p>
        </div>

        {/* Layer Mode Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'white', padding: '0.4rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => {
              setViewMode('incidents');
              setSelectedItem(null);
            }}
            className="btn btn-sm"
            style={{
              backgroundColor: viewMode === 'incidents' ? '#0284c7' : 'transparent',
              color: viewMode === 'incidents' ? 'white' : '#475569',
              border: 'none'
            }}
          >
            <AlertTriangle size={14} /> Active Incidents ({incidents.length})
          </button>
          <button
            onClick={() => {
              setViewMode('reports');
              setSelectedItem(null);
            }}
            className="btn btn-sm"
            style={{
              backgroundColor: viewMode === 'reports' ? '#0284c7' : 'transparent',
              color: viewMode === 'reports' ? 'white' : '#475569',
              border: 'none'
            }}
          >
            <Droplet size={14} /> Citizen Reports ({reports.length})
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedItem ? '1fr 320px' : '1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <IncidentMap
            items={displayItems}
            itemType={viewMode === 'incidents' ? 'incident' : 'report'}
            height="620px"
            onSelect={(item) => setSelectedItem(item)}
          />
        </div>

        {/* Selected Item Drawer */}
        {selectedItem && (
          <div className="card" style={{ padding: '1.5rem', maxHeight: '620px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>
                {selectedItem.incident_number || selectedItem.report_number}
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
              {selectedItem.title}
            </h3>

            <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#64748b' }}>
              <div>📍 <b>Address:</b> {selectedItem.address_text}</div>
              {selectedItem.zone && <div style={{ marginTop: 4 }}>🏙️ <b>Zone:</b> {selectedItem.zone}</div>}
              <div style={{ marginTop: 4 }}>⚙️ <b>Status:</b> {selectedItem.status}</div>
              {selectedItem.severity && <div style={{ marginTop: 4 }}>🚨 <b>Severity:</b> {selectedItem.severity}</div>}
            </div>

            <p style={{ fontSize: '0.85rem', color: '#334155', marginTop: '1rem', lineHeight: 1.4 }}>
              {selectedItem.description}
            </p>

            <div style={{ marginTop: '1.5rem' }}>
              <Link
                to={viewMode === 'incidents' ? `/admin/incidents/${selectedItem.id}` : `/admin/reports/${selectedItem.id}`}
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
              >
                Open Full Management Page
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

