import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getCategoryLabel, formatDistance } from '../../utils/formatters';
import { Navigation } from 'lucide-react';

export default function NearbyReportsMap({
  userLat = 12.9716,
  userLng = 77.5946,
  radiusKm = 5.0,
  reports = [],
  height = '460px',
  onSelectReport
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current).setView([userLat, userLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update center when userLat / userLng changes (e.g. from live GPS resolution)
  useEffect(() => {
    if (mapInstance.current && userLat && userLng) {
      mapInstance.current.setView([userLat, userLng], mapInstance.current.getZoom() || 13);
    }
  }, [userLat, userLng]);

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    // 1. Draw User Live Location Pulsing Pin
    const userIcon = L.divIcon({
      className: 'user-home-pin',
      html: `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="position: absolute; width: 24px; height: 24px; background: rgba(37, 99, 235, 0.3); border-radius: 50%;"></div>
          <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background-color: #2563eb; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    L.marker([userLat, userLng], { icon: userIcon })
      .bindPopup(`
        <div style="text-align: center; font-size: 12px; font-weight: 600;">
          📍 Your Live GPS Location<br/>
          <span style="font-size: 10px; color: #64748b; font-family: monospace;">${userLat.toFixed(5)}, ${userLng.toFixed(5)}</span>
        </div>
      `)
      .addTo(layerGroupRef.current);

    // 2. Draw Radius Circle
    L.circle([userLat, userLng], {
      radius: radiusKm * 1000,
      color: '#0284c7',
      fillColor: '#38bdf8',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4, 4'
    }).addTo(layerGroupRef.current);

    // 3. Draw Nearby Report Pins
    reports.forEach((rep) => {
      if (!rep.latitude || !rep.longitude) return;

      const markerHtml = `
        <div style="background-color: #0284c7; width: 26px; height: 26px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;">
          💧
        </div>
      `;

      const repIcon = L.divIcon({
        className: 'nearby-report-icon',
        html: markerHtml,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([rep.latitude, rep.longitude], { icon: repIcon })
        .addTo(layerGroupRef.current);

      const popupContent = `
        <div style="min-width: 170px; font-family: inherit;">
          <div style="font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase;">
            ${rep.report_number || 'REPORT'} • ${rep.status || ''}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">
            ${rep.title || 'Water Issue'}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            ${getCategoryLabel(rep.category)}
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">
            📍 ${rep.address_text || ''}
          </div>
          ${
            rep.distance_meters !== undefined
              ? `<div style="font-size: 10px; font-weight: 700; color: #0284c7; margin-top: 4px;">📏 ${formatDistance(rep.distance_meters)} away</div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent);

      if (onSelectReport) {
        marker.on('click', () => onSelectReport(rep));
      }
    });
  }, [userLat, userLng, radiusKm, reports]);

  const handleRecenter = () => {
    if (mapInstance.current && userLat && userLng) {
      mapInstance.current.setView([userLat, userLng], 14);
    }
  };

  return (
    <div style={{ position: 'relative', height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <div
        ref={mapRef}
        style={{
          height: '100%',
          width: '100%',
          border: '1px solid #e2e8f0'
        }}
      />
      <button
        onClick={handleRecenter}
        type="button"
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          zIndex: 1000,
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 700,
          color: '#0284c7',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}
        title="Center on Live GPS"
      >
        <Navigation size={13} /> Live GPS
      </button>
    </div>
  );
}
