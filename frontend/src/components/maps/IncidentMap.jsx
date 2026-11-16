import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getCategoryLabel } from '../../utils/formatters';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#0284c7'
};

export default function IncidentMap({
  items = [],
  itemType = 'incident', // 'incident' or 'report'
  center = [12.9716, 77.5946],
  zoom = 13,
  height = '500px',
  onSelect
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current).setView(center, zoom);

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

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    if (items.length === 0) return;

    const bounds = [];

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

    if (bounds.length > 0 && mapInstance.current) {
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [items, itemType]);

  return (
    <div
      ref={mapRef}
      style={{
        height,
        width: '100%',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}
    />
  );
}

