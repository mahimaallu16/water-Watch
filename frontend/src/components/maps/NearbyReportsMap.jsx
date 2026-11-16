import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getCategoryLabel, formatDistance } from '../../utils/formatters';

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

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    // 1. Draw User Location Marker
    const userIcon = L.divIcon({
      className: 'user-home-pin',
      html: `
        <div style="background-color: #2563eb; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(37,99,235,0.3);"></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    L.marker([userLat, userLng], { icon: userIcon })
      .bindPopup('<b>Your Location</b>')
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

      const isResolved = rep.status === 'resolved';
      const pinColor = isResolved ? '#16a34a' : '#0284c7';

      const icon = L.divIcon({
        className: 'nearby-rep-pin',
        html: `
          <div style="background-color: ${pinColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 11px; box-shadow: 0 2px 5px rgba(0,0,0,0.25);">
            💧
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([rep.latitude, rep.longitude], { icon })
        .addTo(layerGroupRef.current);

      const popup = `
        <div style="padding: 2px; min-width: 170px;">
          <div style="font-size: 11px; font-weight: 700; color: ${pinColor}; text-transform: uppercase;">
            ${rep.report_number} • ${rep.status}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">
            ${rep.title}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            ${getCategoryLabel(rep.category)}
          </div>
          ${rep.distance_km !== undefined ? `
            <div style="font-size: 11px; color: #0284c7; font-weight: 600; margin-top: 4px;">
              📍 ${rep.distance_km} km away
            </div>
          ` : ''}
        </div>
      `;
      marker.bindPopup(popup);

      if (onSelectReport) {
        marker.on('click', () => onSelectReport(rep));
      }
    });

    mapInstance.current.setView([userLat, userLng], 13);
  }, [userLat, userLng, radiusKm, reports]);

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

