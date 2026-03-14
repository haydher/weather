import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart, CategoryScale, LinearScale, BarElement, BarController, Tooltip, registerables } from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip, ...registerables);

/** US state full name → 2-letter abbreviation */
const US_STATE_ABBR = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};
function abbreviateState(stateName) {
  if (!stateName) return '';
  const key = String(stateName).toLowerCase().trim();
  return US_STATE_ABBR[key] || (key.length <= 2 ? key.toUpperCase() : stateName);
}

const STORAGE_KEY = 'weather-location';
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const IPAPI_URL = 'https://ipapi.co/json/';

function fToC(f) {
  if (f == null) return null;
  return Math.round(((Number(f) - 32) * 5) / 9);
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString([], { weekday: 'short' });
}

function windDirectionToDegrees(dir) {
  if (!dir) return 0;
  const map = { N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5 };
  return map[dir.toUpperCase()] ?? 0;
}

/** Map NWS shortForecast to Basmilius/Meteocons icon filename (svg-static) */
function getWeatherIcon(shortForecast, isDaytime = true) {
  if (!shortForecast) return 'overcast';
  const f = shortForecast.toLowerCase();
  if (f.includes('thunder')) return 'thunderstorms-rain';
  if (f.includes('snow')) return 'snow';
  if (f.includes('sleet') || f.includes('ice')) return 'sleet';
  if (f.includes('rain') || f.includes('shower')) return isDaytime ? 'partly-cloudy-day-rain' : 'partly-cloudy-night-rain';
  if (f.includes('drizzle')) return 'drizzle';
  if (f.includes('fog') || f.includes('mist')) return 'fog';
  if (f.includes('wind')) return 'wind';
  if (f.includes('mostly cloudy') || f.includes('overcast')) return 'cloudy';
  if (f.includes('partly cloudy') || f.includes('partly sunny')) return isDaytime ? 'partly-cloudy-day' : 'partly-cloudy-night';
  if (f.includes('cloudy')) return 'cloudy';
  if (f.includes('clear') || f.includes('sunny')) return isDaytime ? 'clear-day' : 'clear-night';
  return isDaytime ? 'partly-cloudy-day' : 'partly-cloudy-night';
}

/* Basmilius Weather Icons via jsDelivr GitHub CDN (darksky set: clear-day, rain, thunderstorm, etc.) */
const WEATHER_ICONS_BASE = 'https://cdn.jsdelivr.net/gh/basmilius/weather-icons@2.0.0/production/fill/darksky';
const WEATHER_ICONS_FALLBACK = 'https://cdn.jsdelivr.net/gh/basmilius/weather-icons@2.0.0/production/fill/darksky';
function weatherIconUrl(name) {
  const file = name === 'thunderstorms-rain' ? 'thunderstorm' : name;
  return `${WEATHER_ICONS_BASE}/${file}.svg`;
}

function getGradientForCondition(shortForecast, isDaytime) {
  if (!shortForecast) return 'var(--bg-base)';
  const s = shortForecast.toLowerCase();
  if (s.includes('rain') || s.includes('drizzle') || s.includes('storm')) return 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #0a0f1e 100%)';
  if (s.includes('snow')) return 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #0a0f1e 100%)';
  if (s.includes('clear') && !isDaytime) return 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0a0f1e 100%)';
  if (s.includes('cloud') || s.includes('overcast')) return 'linear-gradient(135deg, #1e293b 0%, #334155 40%, #0a0f1e 100%)';
  if (s.includes('sunny') || s.includes('clear')) return 'linear-gradient(135deg, #422006 0%, #78350f 30%, #0f172a 70%, #0a0f1e 100%)';
  return 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #0a0f1e 100%)';
}

function isInUS(lat, lon) {
  return lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66;
}

const DEBOUNCE_MS = 300;

export default function App() {
  const [query, setQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [points, setPoints] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [forecastHourly, setForecastHourly] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [unitPrimary, setUnitPrimary] = useState('F');
  const [expandedDayIndex, setExpandedDayIndex] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [liveMapOpen, setLiveMapOpen] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const searchInputRef = useRef(null);

  const loadSavedPlace = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const place = JSON.parse(raw);
        if (place?.lat != null && place?.lon != null) return place;
      }
    } catch (_) {}
    return null;
  }, []);

  const reverseGeocode = useCallback(async (lat, lon) => {
    const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lon}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WeatherApp/2.0' } });
    const data = await res.json();
    const addr = data?.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const stateAbbr = addr.state_code || abbreviateState(addr.state) || '';
    const displayName = [city, stateAbbr].filter(Boolean).length
      ? `${city}, ${stateAbbr}`.trim()
      : (data?.display_name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
    return { lat, lon, displayName };
  }, []);

  useEffect(() => {
    const saved = loadSavedPlace();
    if (saved) {
      setSelectedPlace(saved);
      return;
    }
    setLocationDetecting(true);
    const onSuccess = async (pos) => {
      const { latitude, longitude } = pos.coords;
      if (!isInUS(latitude, longitude)) {
        setLocationDetecting(false);
        setSearchFocused(true);
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
      setSearchFocused(true);
    };
    if (!navigator.geolocation) {
      onFail();
      return;
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onFail, { timeout: 8000, maximumAge: 300000 });
  }, [loadSavedPlace, reverseGeocode]);

  useEffect(() => {
    if (searchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchFocused]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setGeocodeResults([]);
      setDropdownOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us`;
        const res = await fetch(url, { headers: { 'User-Agent': 'WeatherApp/2.0' } });
        const data = await res.json();
        const list = Array.isArray(data) ? data.filter((r) => r.lat && r.lon && isInUS(parseFloat(r.lat), parseFloat(r.lon))) : [];
        setGeocodeResults(list);
        setDropdownOpen(list.length > 0);
      } catch (_) {
        setGeocodeResults([]);
        setDropdownOpen(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    if (!selectedPlace) {
      setPoints(null);
      setForecast(null);
      setForecastHourly(null);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setErrorMessage('');

    (async () => {
      try {
        const { lat, lon } = selectedPlace;
        const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
          headers: { Accept: 'application/json' },
        });
        if (!pointsRes.ok) {
          if (pointsRes.status === 404 || pointsRes.status >= 500) {
            setErrorMessage('NWS only covers US locations — try a US city');
          } else {
            setErrorMessage('NWS data unavailable');
          }
          setStatus('error');
          return;
        }
        const pointsData = await pointsRes.json();
        if (cancelled) return;
        const props = pointsData?.properties;
        if (!props?.forecast || !props?.forecastHourly) {
          setErrorMessage('NWS data unavailable');
          setStatus('error');
          return;
        }
        setPoints(pointsData);

        const [forecastRes, hourlyRes] = await Promise.all([
          fetch(props.forecast, { headers: { Accept: 'application/json' } }),
          fetch(props.forecastHourly, { headers: { Accept: 'application/json' } }),
        ]);
        if (cancelled) return;
        const [forecastJson, hourlyJson] = await Promise.all([forecastRes.json(), hourlyRes.json()]);
        if (cancelled) return;
        setForecast(forecastJson);
        setForecastHourly(hourlyJson);
        setStatus('success');
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e.message || 'Something went wrong');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPlace]);

  const formatPlaceDisplay = useCallback((place) => {
    if (!place) return '';
    const addr = place.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || place.name || '';
    const stateAbbr = addr.state_code || abbreviateState(addr.state || place.state) || 'US';
    return [city, stateAbbr].filter(Boolean).length ? `${city}, ${stateAbbr}`.trim() : (place.display_name || '');
  }, []);

  const handleSelectPlace = useCallback((place) => {
    const displayName = formatPlaceDisplay(place) || place.display_name || `${place.name || ''}, ${place.state || 'US'}`.trim();
    const item = {
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon),
      displayName,
    };
    setSelectedPlace(item);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
    } catch (_) {}
    setQuery('');
    setGeocodeResults([]);
    setDropdownOpen(false);
    setSearchFocused(false);
  }, [formatPlaceDisplay]);

  const refresh = useCallback(() => {
    if (!selectedPlace) return;
    setRefreshing(true);
    const { lat, lon } = selectedPlace;
    fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((pointsData) => {
        const props = pointsData?.properties;
        if (!props?.forecast || !props?.forecastHourly) return;
        return Promise.all([
          fetch(props.forecast, { headers: { Accept: 'application/json' } }).then((r) => r.json()),
          fetch(props.forecastHourly, { headers: { Accept: 'application/json' } }).then((r) => r.json()),
        ]).then(([forecastJson, hourlyJson]) => {
          setForecast(forecastJson);
          setForecastHourly(hourlyJson);
          setStatus('success');
          setErrorMessage('');
        });
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [selectedPlace]);

  const retry = useCallback(() => {
    setErrorMessage('');
    if (selectedPlace) {
      setStatus('loading');
      const { lat, lon } = selectedPlace;
      fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers: { Accept: 'application/json' } })
        .then((r) => r.json())
        .then((pointsData) => {
          const props = pointsData?.properties;
          if (!props?.forecast || !props?.forecastHourly) {
            setStatus('error');
            setErrorMessage('NWS data unavailable');
            return;
          }
          return Promise.all([
            fetch(props.forecast, { headers: { Accept: 'application/json' } }).then((r) => r.json()),
            fetch(props.forecastHourly, { headers: { Accept: 'application/json' } }).then((r) => r.json()),
          ]).then(([forecastJson, hourlyJson]) => {
            setForecast(forecastJson);
            setForecastHourly(hourlyJson);
            setPoints(pointsData);
            setStatus('success');
          });
        })
        .catch(() => {
          setStatus('error');
          setErrorMessage('Something went wrong');
        });
    }
  }, [selectedPlace]);

  const periods = forecast?.properties?.periods ?? [];
  const hourlyPeriods = forecastHourly?.properties?.periods ?? [];
  const now = new Date();

  const currentPeriod = periods.find((p) => {
    const start = new Date(p.startTime);
    const end = new Date(p.endTime);
    return now >= start && now < end;
  }) || periods[0];

  const todayDayPeriod = periods.find((p) => p.isDaytime && new Date(p.startTime).toDateString() === now.toDateString());
  const todayNightPeriod = periods.find((p) => !p.isDaytime && new Date(p.startTime).toDateString() === now.toDateString());
  const todayHigh = todayDayPeriod?.temperature ?? currentPeriod?.temperature;
  const todayLow = todayNightPeriod?.temperature ?? periods.find((p) => !p.isDaytime)?.temperature ?? currentPeriod?.temperature;

  const next24Hourly = useMemo(() => hourlyPeriods.slice(0, 24), [hourlyPeriods]);
  const precipPeak = next24Hourly.reduce((best, p) => {
    const val = p.probabilityOfPrecipitation?.value ?? 0;
    return val > (best?.val ?? 0) ? { period: p, val } : best;
  }, null);
  const precipHeader = precipPeak && precipPeak.val >= 20
    ? `Rain expected at ${formatTime(precipPeak.period.startTime)}`
    : 'Next 24 hours';

  const dayGroups = [];
  const seen = new Set();
  for (const p of periods) {
    const day = new Date(p.startTime).toDateString();
    if (seen.has(day)) continue;
    seen.add(day);
    const dayPeriod = periods.filter((x) => new Date(x.startTime).toDateString() === day && x.isDaytime)[0];
    const nightPeriod = periods.filter((x) => new Date(x.startTime).toDateString() === day && !x.isDaytime)[0];
    dayGroups.push({ day, dayPeriod, nightPeriod, name: formatDay(dayPeriod?.startTime || nightPeriod?.startTime) });
    if (dayGroups.length >= 10) break;
  }

  const timeGreeting = () => {
    const h = now.getHours();
    const s = currentPeriod?.shortForecast ?? '';
    const lower = s.toLowerCase();
    if (h >= 5 && h < 12) return lower.includes('rain') || lower.includes('snow') ? 'Good morning, expect rain today.' : 'Good morning, clear skies ahead.';
    if (h >= 12 && h < 17) return lower.includes('rain') || lower.includes('snow') ? 'Good afternoon, showers possible.' : 'Good afternoon.';
    return lower.includes('rain') || lower.includes('snow') ? 'Good evening, expect rain tonight.' : 'Good evening, clear tonight.';
  };

  return (
    <>
      <div className="starfield" aria-hidden="true" />

      <motion.div
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search bar — single pill, label + input same container, opacity transition only */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            className="glass-card search-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: 9999,
              padding: '10px 16px',
              minHeight: 48,
              border: '1px solid var(--border-glass)',
              background: 'rgba(10, 15, 30, 0.7)',
              position: 'relative',
            }}
          >
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <label
                className="search-label"
                htmlFor="city-search"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: 0,
                  cursor: 'pointer',
                  color: selectedPlace ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  letterSpacing: '0.04em',
                  opacity: searchFocused ? 0 : 1,
                  pointerEvents: searchFocused ? 'none' : 'auto',
                  transition: 'opacity 150ms ease',
                }}
                onClick={() => setSearchFocused(true)}
              >
                <PinIcon />
                {locationDetecting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="search-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-clear)' }} />
                    Detecting…
                  </span>
                ) : selectedPlace ? (
                  selectedPlace.displayName
                ) : (
                  'Search a US city…'
                )}
              </label>
              <input
                ref={searchInputRef}
                id="city-search"
                type="text"
                placeholder="Search a US city..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => { if (!dropdownOpen) setSearchFocused(false); }, 180)}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  outline: 'none',
                  letterSpacing: '0.04em',
                  opacity: searchFocused ? 1 : 0,
                  pointerEvents: searchFocused ? 'auto' : 'none',
                  transition: 'opacity 150ms ease',
                }}
                aria-label="Search a US city"
              />
            </div>
            <button
              type="button"
              onClick={() => setSearchFocused(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              aria-label="Search"
            >
              <SearchIcon />
            </button>
          </div>
          <AnimatePresence>
            {dropdownOpen && geocodeResults.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  marginTop: 6,
                  borderRadius: 16,
                  background: 'rgba(10, 15, 30, 0.95)',
                  border: '1px solid var(--border-glass)',
                  backdropFilter: 'var(--blur)',
                  zIndex: 10,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {geocodeResults.map((r) => (
                  <li
                    key={r.place_id || r.lat + r.lon}
                    onClick={() => handleSelectPlace(r)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border-glass)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                    }}
                  >
                    {formatPlaceDisplay(r) || r.display_name}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Error state */}
        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding: 16,
                borderRadius: 12,
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--text-primary)',
              }}
            >
              <p style={{ margin: '0 0 12px' }}>{errorMessage}</p>
              <button
                type="button"
                onClick={retry}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero card — no city name; greeting, temp, condition once, °F|°C pill bottom-right */}
        {selectedPlace && (
          <AnimatePresence mode="wait">
            {(status === 'loading' || locationDetecting) && (
              <motion.div
                key="hero-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card"
                style={{ padding: 24, minHeight: 280 }}
              >
                <div className="shimmer" style={{ height: 20, width: '70%', marginBottom: 16 }} />
                <div className="shimmer" style={{ height: 72, width: '50%', marginBottom: 16 }} />
                <div className="shimmer" style={{ height: 24, width: '60%' }} />
              </motion.div>
            )}
            {status === 'success' && currentPeriod && !locationDetecting && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="glass-card hero-card"
                style={{
                  padding: 20,
                  background: getGradientForCondition(currentPeriod.shortForecast, currentPeriod.isDaytime),
                  backgroundSize: '200% 200%',
                  transition: 'background 2s ease',
                }}
              >
                <p className="hero-greeting" style={{ margin: '0 0 12px', fontSize: 13, fontStyle: 'italic', opacity: 0.6, fontFamily: 'var(--font-body)' }}>
                  {timeGreeting()}
                </p>
                <div className="hero-left">
                  <TemperatureDisplay value={currentPeriod.temperature} unitPrimary={unitPrimary} />
                  <p style={{ margin: '8px 0 0', fontSize: 18, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {currentPeriod.shortForecast}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                    Feels like {unitPrimary === 'F' ? currentPeriod.temperature : fToC(currentPeriod.temperature)}°{unitPrimary} ({unitPrimary === 'F' ? fToC(currentPeriod.temperature) : currentPeriod.temperature}°{unitPrimary === 'F' ? 'C' : 'F'})
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                    H {todayHigh}° / L {todayLow}°
                  </p>
                </div>
                <div className="hero-icon">
                  <WeatherIcon shortForecast={currentPeriod.shortForecast} isDaytime={currentPeriod.isDaytime} size={96} alt={currentPeriod.shortForecast} />
                </div>
                <div className="hero-bottom-row">
                  {currentPeriod.windSpeed ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <WindArrow direction={currentPeriod.windDirection} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{currentPeriod.windSpeed}</span>
                    </div>
                  ) : (
                    <span />
                  )}
                  <div className="unit-toggle">
                    <button
                      type="button"
                      className={unitPrimary === 'F' ? 'active' : 'inactive'}
                      onClick={() => setUnitPrimary('F')}
                    >
                      °F
                    </button>
                    <button
                      type="button"
                      className={unitPrimary === 'C' ? 'active' : 'inactive'}
                      onClick={() => setUnitPrimary('C')}
                    >
                      °C
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Precipitation chart — 24h, thin line/area, Chart.js */}
        {status === 'success' && next24Hourly.length > 0 && (
          <PrecipChart
            hourlyPeriods={next24Hourly}
            formatTime={formatTime}
            header={precipHeader}
            chartRef={chartRef}
            chartInstanceRef={chartInstanceRef}
          />
        )}

        {/* Hourly strip — 72x120 cards, 24 cards, scroll-snap, stagger 50ms */}
        {status === 'success' && hourlyPeriods.length > 0 && (
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
          >
            <h2 className="weather-label" style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 18 }}>Hourly</h2>
            <div
              className="hide-scrollbar"
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                paddingBottom: 8,
              }}
            >
              {hourlyPeriods.slice(0, 24).map((p, i) => {
                const isNow = now >= new Date(p.startTime) && now < new Date(p.endTime);
                return (
                  <motion.div
                    key={p.startTime}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.35 }}
                    className="glass-card"
                    style={{
                      flex: '0 0 72px',
                      minWidth: 72,
                      height: 120,
                      scrollSnapAlign: 'start',
                      padding: '10px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-glass)',
                      boxShadow: isNow ? '0 0 0 1.5px rgba(100,180,255,0.8)' : undefined,
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{isNow ? 'Now' : formatTime(p.startTime)}</div>
                    <WeatherIcon shortForecast={p.shortForecast} isDaytime={p.isDaytime} size={32} />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 300 }}>{unitPrimary === 'F' ? p.temperature : fToC(p.temperature)}°{unitPrimary}</div>
                    <div style={{ fontSize: 11, opacity: 0.45 }}>{fToC(p.temperature)}°C</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{p.probabilityOfPrecipitation?.value ?? 0}%</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* 10-day forecast — flex row, breathing room, expandable, stagger 60ms */}
        {status === 'success' && dayGroups.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="weather-label" style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 18 }}>10-Day Forecast</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }} className="forecast-list">
              {dayGroups.map((group, idx) => {
                const high = group.dayPeriod?.temperature ?? group.nightPeriod?.temperature;
                const low = group.nightPeriod?.temperature ?? group.dayPeriod?.temperature;
                const precip = group.dayPeriod?.probabilityOfPrecipitation?.value ?? group.nightPeriod?.probabilityOfPrecipitation?.value ?? 0;
                const detailed = group.dayPeriod?.detailedForecast || group.nightPeriod?.detailedForecast || '';
                const wind = group.dayPeriod?.windSpeed || group.nightPeriod?.windSpeed || '';
                const windDir = group.dayPeriod?.windDirection || group.nightPeriod?.windDirection || '';
                const isExpanded = expandedDayIndex === idx;
                const shortForecast = group.dayPeriod?.shortForecast || group.nightPeriod?.shortForecast;
                return (
                  <motion.li
                    key={group.day}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.06, duration: 0.35 }}
                  >
                    <motion.div
                      className="glass-card"
                      style={{ overflow: 'hidden', cursor: 'pointer' }}
                      onClick={() => setExpandedDayIndex(isExpanded ? null : idx)}
                      layout
                    >
                      <div className="forecast-row">
                        <span className="day-name">{group.name}</span>
                        <div className="forecast-icon-precip">
                          <WeatherIcon shortForecast={shortForecast} isDaytime size={28} alt="" />
                          <span className="precip-pct">{precip}%</span>
                        </div>
                        <div className="forecast-temps">
                          <span className="temp-high">H {high}°</span>
                          <span className="temp-divider">/</span>
                          <span className="temp-low">L {low}°</span>
                          <span className="temp-celsius">({fToC(high)}°/{fToC(low)}°)</span>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                            <p style={{ margin: '0 16px 12px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{detailed}</p>
                            {(wind || windDir) && (
                              <p style={{ margin: '0 16px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Wind: {wind} {windDir}</p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.li>
                );
              })}
            </ul>
          </motion.section>
        )}

        {/* Live Map — Windy embed */}
        {status === 'success' && selectedPlace && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button
              type="button"
              onClick={() => setLiveMapOpen((o) => !o)}
              className="glass-card"
              style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                border: '1px solid var(--border-glass)',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 12,
              }}
            >
              🛰 Live Map
            </button>
            <AnimatePresence>
              {liveMapOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden', marginTop: 8 }}
                >
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                    <iframe
                      title="Windy Live Map"
                      src={`https://embed.windy.com/embed.html?lat=${selectedPlace.lat}&lon=${selectedPlace.lon}&zoom=7&level=surface&overlay=clouds`}
                      width="100%"
                      height="280"
                      frameBorder="0"
                      style={{ display: 'block' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {!selectedPlace && !locationDetecting && status === 'idle' && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>Search a US city to get started.</p>
        )}
      </motion.div>
    </>
  );
}

function TemperatureDisplay({ value, unitPrimary }) {
  const num = value != null ? Number(value) : 0;
  const displayVal = unitPrimary === 'F' ? num : fToC(num);
  const secondary = unitPrimary === 'F' ? fToC(num) : num;
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    const target = Math.round(displayVal);
    const duration = 300;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - (1 - t) * (1 - t);
      setCount(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [displayVal]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 300, lineHeight: 1 }}>
        {count}°{unitPrimary}
      </span>
      <p style={{ margin: '2px 0 0', fontSize: 22, opacity: 0.5 }}>{secondary}°{unitPrimary === 'F' ? 'C' : 'F'}</p>
    </motion.div>
  );
}

function WindArrow({ direction }) {
  const deg = windDirectionToDegrees(direction);
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: `rotate(${deg}deg)` }}>
      <path d="M12 2v20M12 2l4 4M12 2L8 6" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

/** Weather icon via Basmilius Meteocons CDN (img tag) */
function WeatherIcon({ shortForecast, isDaytime = true, size = 32, alt }) {
  const name = getWeatherIcon(shortForecast, isDaytime);
  const src = weatherIconUrl(name);
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt || shortForecast || 'Weather'}
      style={{ objectFit: 'contain', display: 'block' }}
      onError={(e) => {
        const t = e.target;
        if (t.dataset.fallback) {
          t.style.opacity = '0';
          return;
        }
        t.dataset.fallback = '1';
        const file = name === 'thunderstorms-rain' ? 'thunderstorm' : name;
        t.src = `${WEATHER_ICONS_FALLBACK}/${file}.svg`;
      }}
    />
  );
}

/** Precipitation chart — next 24h, Chart.js bar chart, only re-init when data changes */
function PrecipChart({ hourlyPeriods, formatTime, header, chartRef, chartInstanceRef }) {
  const precipData = useMemo(
    () => hourlyPeriods.map((p) => p.probabilityOfPrecipitation?.value ?? 0),
    [hourlyPeriods],
  );
  const hourlyLabels = useMemo(
    () => hourlyPeriods.map((p) => formatTime(p.startTime)),
    [hourlyPeriods, formatTime],
  );

  useEffect(() => {
    if (!hourlyLabels.length || !precipData.length || !chartRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
    const ctx = chartRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hourlyLabels,
        datasets: [{
          data: precipData,
          backgroundColor: (ctx) => {
            const value = ctx.raw;
            return `rgba(100, 180, 255, ${0.2 + (value / 100) * 0.7})`;
          },
          borderColor: 'rgba(120, 200, 255, 0.6)',
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        animation: {
          delay: (ctx) => ctx.dataIndex * 20,
          duration: 600,
          easing: 'easeOutQuart',
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: 'rgba(255,255,255,0.35)',
              font: { size: 10, family: 'Nunito Sans' },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8,
            },
            border: { display: false },
          },
          y: {
            display: false,
            min: 0,
            max: 100,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw}% chance`,
            },
            backgroundColor: 'rgba(10, 20, 40, 0.85)',
            titleColor: 'rgba(255,255,255,0.7)',
            bodyColor: '#fff',
            padding: 8,
            cornerRadius: 8,
          },
        },
        responsive: true,
        maintainAspectRatio: false,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    });
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [hourlyLabels, precipData]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card"
      style={{ padding: 16 }}
    >
      <p className="weather-label" style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>{header}</p>
      <div style={{ height: 100 }}>
        <canvas ref={chartRef} />
      </div>
    </motion.section>
  );
}
