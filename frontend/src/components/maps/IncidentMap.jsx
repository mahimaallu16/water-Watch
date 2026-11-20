import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getCategoryLabel } from '../../utils/formatters';
import { Navigation } from 'lucide-react';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#0284c7'
};

export default function IncidentMap({
  items = [],
  itemType = 'incident', // 'incident' or 'report'
  center = null,
  userLocation = null,
  zoom = 13,
  height = '500px',
  onSelect
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layerGroupRef = useRef(null);
  const userMarkerRef = useRef(null);

  // Live GPS state: defaults to userLocation or null until detected
  const [liveLocation, setLiveLocation] = useState(userLocation || null);

  // Auto-detect browser live GPS if not passed
  useEffect(() => {
    if (userLocation) {
      setLiveLocation(userLocation);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLiveLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn('IncidentMap live GPS fallback:', err.message);
          // If denied, fallback to [12.9716, 77.5946]
          setLiveLocation([12.9716, 77.5946]);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLiveLocation([12.9716, 77.5946]);
    }
  }, [userLocation]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const initialCenter = center || liveLocation || [12.9716, 77.5946];
      const map = L.map(mapRef.current).setView(initialCenter, zoom);

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

  // Update map center when live GPS resolves and no items exist
  useEffect(() => {
    if (mapInstance.current && liveLocation && items.length === 0 && !center) {
      mapInstance.current.setView(liveLocation, zoom);
    }
  }, [liveLocation, items.length, center, zoom]);

  // Render items and user live location marker
  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    // 1. Draw Live User / Post Location Beacon
    if (liveLocation && Array.isArray(liveLocation) && liveLocation.length === 2) {
      const livePulseIcon = L.divIcon({
        className: 'live-gps-pin',
        html: `
          <div style="position: relative; width: 28px; height: 28px;">
            <div style="position: absolute; width: 28px; height: 28px; background: rgba(2, 132, 199, 0.35); border-radius: 50%; box-shadow: 0 0 10px rgba(2, 132, 199, 0.5);"></div>
            <div style="position: absolute; top: 6px; left: 6px; width: 16px; height: 16px; background: #0284c7; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker(liveLocation, { icon: livePulseIcon })
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px; font-weight: 600; color: #0284c7; text-align: center;">
            📍 Your Live GPS Location<br/>
            <span style="font-size: 10px; color: #64748b; font-family: monospace;">${liveLocation[0].toFixed(5)}, ${liveLocation[1].toFixed(5)}</span>
          </div>
        `)
        .addTo(layerGroupRef.current);
    }

    // 2. Render Incident / Report Items
    const bounds = [];
    if (liveLocation && items.length === 0) {
      bounds.push(liveLocation);
    }

    items.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const latLng = [item.latitude, item.longitude];
      bounds.push(latLng);

      const color = item.severity ? SEVERITY_COLORS[item.severity] || '#0284c7' : '#0284c7';
      const label = itemType === 'incident' ? item.incident_number : item.report_number;

      const markerHtml = `
        <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 800;">
          💧
        </div>
      `;

      const icon = L.divIcon({
        className: 'incident-marker-icon',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker(latLng, { icon }).addTo(layerGroupRef.current);

      const popupContent = `
        <div style="font-family: inherit; min-width: 180px; padding: 2px;">
          <div style="font-size: 11px; font-weight: 700; color: ${color}; text-transform: uppercase;">
            ${label || ''} • ${item.status || ''}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">
            ${item.title || 'Water Issue'}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            ${getCategoryLabel(item.category)}
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">
            📍 ${item.address_text || ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      if (onSelect) {
        marker.on('click', () => onSelect(item));
      }
    });

    if (items.length > 0 && bounds.length > 0 && mapInstance.current) {
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [items, itemType, liveLocation]);

  const handleRecenter = () => {
    if (mapInstance.current && liveLocation) {
      mapInstance.current.setView(liveLocation, 14);
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
      {liveLocation && (
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
      )}
    </div>
  );
}
