import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

export default function LocationPicker({
  latitude = 12.9716,
  longitude = 77.5946,
  onChange,
  height = '320px'
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [coords, setCoords] = useState({ lat: latitude, lng: longitude });
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('Standby');

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize Leaflet Map
    if (!mapInstance.current) {
      const map = L.map(mapRef.current).setView([latitude, longitude], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      // Custom Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background-color: #0284c7; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      const marker = L.marker([latitude, longitude], {
        draggable: true,
        icon: customIcon
      }).addTo(map);

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
        if (onChange) onChange(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        if (onChange) onChange(e.latlng.lat, e.latlng.lng);
      });

      mapInstance.current = map;
      markerRef.current = marker;

      // Auto-detect live GPS on component load
      if (navigator.geolocation) {
        setIsLocating(true);
        setGpsStatus('Locating via GPS...');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            setCoords({ lat, lng });
            map.setView([lat, lng], 16);
            marker.setLatLng([lat, lng]);
            setIsLocating(false);
            setGpsStatus('Live GPS Lock');
            if (onChange) onChange(lat, lng);
          },
          (err) => {
            console.log('GPS auto-locate notice:', err.message);
            setIsLocating(false);
            setGpsStatus('Manual / Default');
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      }
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    setGpsStatus('Acquiring live GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        if (mapInstance.current && markerRef.current) {
          mapInstance.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
        setIsLocating(false);
        setGpsStatus('Live GPS Locked');
        if (onChange) onChange(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        setGpsStatus('GPS Unavailable');
        alert('Could not acquire live GPS location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={mapRef}
        style={{
          height,
          width: '100%',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 500,
          display: 'flex',
          gap: 6
        }}
      >
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          style={{
            backgroundColor: isLocating ? '#f1f5f9' : 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.45rem 0.75rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            cursor: isLocating ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {isLocating ? (
            <>
              <Loader2 size={14} className="spin-animation" /> Acquiring Live GPS...
            </>
          ) : (
            <>
              <Navigation size={14} /> Detect Live GPS
            </>
          )}
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 6,
          fontSize: '0.78rem',
          color: '#64748b'
        }}
      >
        <span>
          Click map or drag pin to adjust &bull;{' '}
          <strong style={{ color: gpsStatus.includes('Live') ? '#16a34a' : '#64748b' }}>
            {gpsStatus}
          </strong>
        </span>
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </span>
      </div>
    </div>
  );
}
