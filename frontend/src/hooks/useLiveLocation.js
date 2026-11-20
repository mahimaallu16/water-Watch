import { useState, useEffect, useCallback } from 'react';

/**
 * Reusable hook to auto-detect and track the client's live GPS coordinates.
 * Falls back to Bengaluru [12.9716, 77.5946] only if geolocation is unsupported or denied.
 */
export function useLiveLocation(fallbackLat = 12.9716, fallbackLng = 77.5946) {
  const [location, setLocation] = useState({
    latitude: fallbackLat,
    longitude: fallbackLng,
    accuracy: null,
    isLive: false,
    loading: true,
    error: null
  });

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: 'Geolocation not supported by this browser'
      }));
      return;
    }

    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          isLive: true,
          loading: false,
          error: null
        });
      },
      (err) => {
        console.warn('Live geolocation failed, using fallback:', err.message);
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: err.message
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, [fallbackLat, fallbackLng]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  return { ...location, refresh: detectLocation };
}
