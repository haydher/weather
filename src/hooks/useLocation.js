import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEY, IPAPI_URL, isInUS } from '../lib/constants.js';
import { reverseGeocode } from '../lib/nominatim.js';

function loadSavedPlace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const place = JSON.parse(raw);
      if (place?.lat != null && place?.lon != null) return place;
    }
  } catch (_) {}
  return null;
}

export function useLocation() {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [locationDetecting, setLocationDetecting] = useState(true);

  useEffect(() => {
    const saved = loadSavedPlace();
    if (saved) {
      setSelectedPlace(saved);
      setLocationDetecting(false);
      return;
    }
    setLocationDetecting(true);
    const onSuccess = async (pos) => {
      const { latitude, longitude } = pos.coords;
      if (!isInUS(latitude, longitude)) {
        setLocationDetecting(false);
        return;
      }
      try {
        const place = await reverseGeocode(latitude, longitude);
        setSelectedPlace(place);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
        } catch (_) {}
      } catch (_) {}
      setLocationDetecting(false);
    };
    const onFail = async () => {
      try {
        const res = await fetch(IPAPI_URL);
        const data = await res.json();
        const lat = parseFloat(data.latitude);
        const lon = parseFloat(data.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon) && isInUS(lat, lon)) {
          const place = await reverseGeocode(lat, lon);
          setSelectedPlace(place);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
          } catch (_) {}
        }
      } catch (_) {}
      setLocationDetecting(false);
    };
    if (!navigator.geolocation) {
      onFail();
      return;
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onFail, { timeout: 8000, maximumAge: 300000 });
  }, []);

  const savePlace = useCallback((place) => {
    if (!place) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
    } catch (_) {}
  }, []);

  return { selectedPlace, setSelectedPlace, locationDetecting, savePlace };
}
