import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'weather-location';
const PRESET_CITIES = [
  { name: 'New York', lat: 40.7128, lon: -74.006, displayName: 'New York, NY' },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, displayName: 'Los Angeles, CA' },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298, displayName: 'Chicago, IL' },
  { name: 'Miami', lat: 25.7617, lon: -80.1918, displayName: 'Miami, FL' },
];

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

function shortForecastToIcon(shortForecast) {
  if (!shortForecast) return 'cloud';
  const s = shortForecast.toLowerCase();
  if (s.includes('sunny') || s.includes('clear')) return 'sun';
  if (s.includes('rain') || s.includes('drizzle')) return 'rain';
  if (s.includes('snow')) return 'snow';
  if (s.includes('cloud') || s.includes('overcast')) return 'cloud';
  if (s.includes('thunder')) return 'storm';
  return 'cloud';
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
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [points, setPoints] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [forecastHourly, setForecastHourly] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [unitPrimary, setUnitPrimary] = useState('F');
  const [expandedDayIndex, setExpandedDayIndex] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  const loadSavedPlace = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const place = JSON.parse(raw);
        if (place?.lat != null && place?.lon != null) setSelectedPlace(place);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadSavedPlace();
  }, [loadSavedPlace]);

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
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=us&format=json&limit=5`;
        const res = await fetch(url, { headers: { 'User-Agent': 'WeatherApp/1.0' } });
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

  const handleSelectPlace = useCallback((place) => {
    const item = { lat: parseFloat(place.lat), lon: parseFloat(place.lon), displayName: place.display_name || `${place.name || ''}, ${place.state || 'US'}`.trim() };
    setSelectedPlace(item);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
    } catch (_) {}
    setQuery('');
    setGeocodeResults([]);
    setDropdownOpen(false);
  }, []);

  const handlePreset = useCallback((preset) => {
    setSelectedPlace({ lat: preset.lat, lon: preset.lon, displayName: preset.displayName });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat: preset.lat, lon: preset.lon, displayName: preset.displayName }));
    } catch (_) {}
    setQuery('');
    setDropdownOpen(false);
  }, []);

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

  const showPrecipStrip = hourlyPeriods.slice(0, 7).some((p) => {
    const prob = p.probabilityOfPrecipitation?.value ?? 0;
    const s = (p.shortForecast || '').toLowerCase();
    return prob >= 40 || s.includes('rain') || s.includes('snow') || s.includes('precip');
  });

  const firstHighPrecipHour = hourlyPeriods.find((p) => (p.probabilityOfPrecipitation?.value ?? 0) >= 40);
  const precipLabel = firstHighPrecipHour ? `Rain expected ${formatTime(firstHighPrecipHour.startTime)}` : 'Precipitation possible';

  const next7Hourly = hourlyPeriods.slice(0, 7);

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
    if (h >= 5 && h < 12) return lower.includes('rain') || lower.includes('snow') ? 'Good morning, bring an umbrella' : 'Good morning, clear skies ahead';
    if (h >= 12 && h < 17) return lower.includes('rain') || lower.includes('snow') ? 'Afternoon showers possible' : 'Good afternoon';
    return lower.includes('rain') || lower.includes('snow') ? 'Tonight looks rainy' : 'Tonight looks clear';
  };

  const isPresetActive = (preset) => selectedPlace && Math.abs(selectedPlace.lat - preset.lat) < 0.01 && Math.abs(selectedPlace.lon - preset.lon) < 0.01;

  return (
    <>
      <div className="starfield" aria-hidden="true" />

      <motion.div
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search + refresh + unit toggle row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <div ref={dropdownRef} style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search US city..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => geocodeResults.length > 0 && setDropdownOpen(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                outline: 'none',
              }}
            />
            <AnimatePresence>
              {dropdownOpen && geocodeResults.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    marginTop: 4,
                    borderRadius: 12,
                    background: 'var(--bg-card)',
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
                      }}
                    >
                      {r.display_name}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            type="button"
            onClick={refresh}
            disabled={!selectedPlace || refreshing}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: selectedPlace && !refreshing ? 'pointer' : 'default',
            }}
            animate={{ rotate: refreshing ? 360 : 0 }}
            transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
          >
            <RefreshIcon />
          </motion.button>
          <button
            type="button"
            onClick={() => setUnitPrimary((u) => (u === 'F' ? 'C' : 'F'))}
            style={{
              padding: '8px 12px',
              borderRadius: 20,
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            °{unitPrimary}
          </button>
        </div>

        {/* Preset chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESET_CITIES.map((preset) => (
            <motion.button
              key={preset.name}
              type="button"
              onClick={() => handlePreset(preset)}
              style={{
                padding: '10px 16px',
                borderRadius: 20,
                border: isPresetActive(preset) ? '1px solid var(--accent-clear)' : '1px solid var(--border-glass)',
                background: isPresetActive(preset) ? 'rgba(125, 211, 252, 0.1)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                cursor: 'pointer',
                position: 'relative',
                boxShadow: isPresetActive(preset) ? '0 0 12px rgba(125, 211, 252, 0.3)' : 'none',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {preset.name}
              {isPresetActive(preset) && (
                <motion.span
                  layoutId="preset-underline"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 8,
                    right: 8,
                    height: 2,
                    background: 'var(--accent-clear)',
                    borderRadius: 1,
                    boxShadow: '0 0 8px var(--accent-clear)',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
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

        {/* Hero card */}
        {selectedPlace && (
          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <motion.div
                key="hero-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card"
                style={{ padding: 24, minHeight: 280 }}
              >
                <div className="shimmer" style={{ height: 48, width: '60%', marginBottom: 16 }} />
                <div className="shimmer" style={{ height: 24, width: '40%', marginBottom: 24 }} />
                <div className="shimmer" style={{ height: 80, width: '80%' }} />
              </motion.div>
            )}
            {status === 'success' && currentPeriod && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="glass-card"
                style={{
                  padding: 24,
                  background: getGradientForCondition(currentPeriod.shortForecast, currentPeriod.isDaytime),
                  backgroundSize: '200% 200%',
                  transition: 'background 1.5s ease',
                }}
              >
                <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text-secondary)' }}>{timeGreeting()}</p>
                <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--text-secondary)' }}>{selectedPlace.displayName}</p>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <TemperatureDisplay value={currentPeriod.temperature} unitPrimary={unitPrimary} />
                    <p style={{ margin: '4px 0 0', fontSize: 18, color: 'var(--text-secondary)' }}>{currentPeriod.shortForecast}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                      Feels like {unitPrimary === 'F' ? currentPeriod.temperature : fToC(currentPeriod.temperature)}°{unitPrimary} ({unitPrimary === 'F' ? fToC(currentPeriod.temperature) : currentPeriod.temperature}°{unitPrimary === 'F' ? 'C' : 'F'})
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                      H {todayHigh}° / L {todayLow}°
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <WeatherIcon name={shortForecastToIcon(currentPeriod.shortForecast)} isDaytime={currentPeriod.isDaytime} />
                    {currentPeriod.windSpeed && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <WindArrow direction={currentPeriod.windDirection} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{currentPeriod.windSpeed}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Precipitation timeline */}
        {status === 'success' && showPrecipStrip && next7Hourly.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card"
            style={{ padding: 16 }}
          >
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>{precipLabel}</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60 }}>
              {next7Hourly.map((p, i) => {
                const val = p.probabilityOfPrecipitation?.value ?? 0;
                return (
                  <motion.div
                    key={p.startTime}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (val / 100) * 52)}px` }}
                    transition={{ delay: 0.1 * i, duration: 0.4, ease: 'easeOut' }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderRadius: 4,
                      background: 'var(--accent-rain)',
                      opacity: 0.9,
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
              {next7Hourly.map((p) => (
                <span key={p.startTime} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>{formatTime(p.startTime)}</span>
              ))}
            </div>
          </motion.section>
        )}

        {/* Hourly strip */}
        {status === 'success' && hourlyPeriods.length > 0 && (
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
          >
            <h2 style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 18 }}>Hourly</h2>
            <div
              className="hide-scrollbar"
              style={{
                display: 'flex',
                gap: 12,
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
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.03 }}
                    className="glass-card"
                    style={{
                      flex: '0 0 72px',
                      scrollSnapAlign: 'start',
                      padding: 12,
                      border: isNow ? '2px solid var(--accent-clear)' : '1px solid var(--border-glass)',
                      boxShadow: isNow ? '0 0 16px rgba(125, 211, 252, 0.3)' : undefined,
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{i === 0 && isNow ? 'Now' : formatTime(p.startTime)}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{unitPrimary === 'F' ? p.temperature : fToC(p.temperature)}°{unitPrimary}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fToC(p.temperature)}°C</div>
                    <div style={{ marginTop: 4 }}>
                      <SmallWeatherIcon name={shortForecastToIcon(p.shortForecast)} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.probabilityOfPrecipitation?.value ?? 0}%</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* 10-day forecast */}
        {status === 'success' && dayGroups.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 18 }}>10-Day Forecast</h2>
            <motion.ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }} variants={{ visible: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="visible">
              {dayGroups.map((group, idx) => {
                const high = group.dayPeriod?.temperature ?? group.nightPeriod?.temperature;
                const low = group.nightPeriod?.temperature ?? group.dayPeriod?.temperature;
                const precip = group.dayPeriod?.probabilityOfPrecipitation?.value ?? group.nightPeriod?.probabilityOfPrecipitation?.value ?? 0;
                const detailed = group.dayPeriod?.detailedForecast || group.nightPeriod?.detailedForecast || '';
                const wind = group.dayPeriod?.windSpeed || group.nightPeriod?.windSpeed || '';
                const windDir = group.dayPeriod?.windDirection || group.nightPeriod?.windDirection || '';
                const isExpanded = expandedDayIndex === idx;
                return (
                  <motion.li key={group.day} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
                    <motion.div
                      className="glass-card"
                      style={{ padding: 16, overflow: 'hidden' }}
                      onClick={() => setExpandedDayIndex(isExpanded ? null : idx)}
                      layout
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{group.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <SmallWeatherIcon name={shortForecastToIcon(group.dayPeriod?.shortForecast || group.nightPeriod?.shortForecast)} />
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{precip}%</span>
                          <span style={{ fontFamily: 'var(--font-display)' }}>H {high}° / L {low}°</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({fToC(high)}° / {fToC(low)}°)</span>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{detailed}</p>
                            {(wind || windDir) && (
                              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Wind: {wind} {windDir}</p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.section>
        )}

        {!selectedPlace && status === 'idle' && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>Search for a US city or pick a preset to get started.</p>
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
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 300, lineHeight: 1 }}>
        {count}°{unitPrimary}
      </span>
      <p style={{ margin: '4px 0 0', fontSize: 16, color: 'var(--text-secondary)' }}>{secondary}°{unitPrimary === 'F' ? 'C' : 'F'}</p>
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

function RefreshIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 11-2.636-6.364M21 12h-4m0 0l2 2m-2-2l2-2" />
    </svg>
  );
}

function WeatherIcon({ name, isDaytime }) {
  const sun = (
    <svg width={80} height={80} viewBox="0 0 64 64" fill="none" className="icon-sun-rays" style={{ transformOrigin: 'center' }}>
      <circle cx="32" cy="32" r="12" fill="var(--accent-sun)" className="icon-sun-pulse" />
      <path d="M32 4v6M32 54v6M4 32h6M54 32h6M12 12l4 4M48 48l4 4M12 52l4-4M48 16l4-4" stroke="var(--accent-sun)" strokeWidth="2" />
      <path d="M52 12l-4 4M16 48l-4 4M52 52l-4-4M16 16l-4-4" stroke="var(--accent-sun)" strokeWidth="2" />
    </svg>
  );
  const cloud = (
    <svg width={80} height={80} viewBox="0 0 64 64" fill="none" className="icon-cloud-drift">
      <path d="M48 40H18a10 10 0 010-20c0-6 4-12 10-14 2-6 8-10 14-10 8 0 14 6 14 14 6 2 12 8 12 16 0 6-4 10-10 10z" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
  const rain = (
    <svg width={80} height={80} viewBox="0 0 64 64" fill="none">
      <path d="M48 38H18a10 10 0 010-20c0-6 4-12 10-14 2-6 8-10 14-10 8 0 14 6 14 14 6 2 12 8 12 16 0 6-4 10-10 10z" fill="rgba(255,255,255,0.4)" />
      <path d="M28 44l-2 8M34 44l-2 8M40 44l-2 8" stroke="var(--accent-rain)" strokeWidth="2" className="icon-rain" style={{ animationDuration: '1s' }} />
    </svg>
  );
  const snow = (
    <svg width={80} height={80} viewBox="0 0 64 64" fill="none">
      <path d="M48 38H18a10 10 0 010-20c0-6 4-12 10-14 2-6 8-10 14-10 8 0 14 6 14 14 6 2 12 8 12 16 0 6-4 10-10 10z" fill="rgba(255,255,255,0.5)" />
      <circle cx="28" cy="46" r="2" fill="white" className="icon-snow" />
      <circle cx="36" cy="50" r="2" fill="white" className="icon-snow" style={{ animationDelay: '0.5s' }} />
      <circle cx="44" cy="44" r="2" fill="white" className="icon-snow" style={{ animationDelay: '1s' }} />
    </svg>
  );
  const storm = (
    <svg width={80} height={80} viewBox="0 0 64 64" fill="none">
      <path d="M48 38H18a10 10 0 010-20c0-6 4-12 10-14 2-6 8-10 14-10 8 0 14 6 14 14 6 2 12 8 12 16 0 6-4 10-10 10z" fill="rgba(255,255,255,0.3)" />
      <path d="M34 26l-8 12h6l-6 10 14-12h-6l8-10z" fill="var(--accent-sun)" />
    </svg>
  );
  if (name === 'sun') return sun;
  if (name === 'rain') return rain;
  if (name === 'snow') return snow;
  if (name === 'storm') return storm;
  return cloud;
}

function SmallWeatherIcon({ name }) {
  const style = { width: 24, height: 24 };
  const sun = <svg viewBox="0 0 24 24" fill="var(--accent-sun)" style={style} className="icon-sun-pulse"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12h2M18 12h2" stroke="var(--accent-sun)" strokeWidth="1" /></svg>;
  const cloud = <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)" style={style} className="icon-cloud-bob"><path d="M19 14H7a3 3 0 010-6c0-2 1-4 3-5 1-2 3-3 5-3 3 0 5 2 5 5 2 1 4 3 4 6z" /></svg>;
  const rain = <svg viewBox="0 0 24 24" style={style}><path d="M19 14H7a3 3 0 010-6c0-2 1-4 3-5 1-2 3-3 5-3 3 0 5 2 5 5 2 1 4 3 4 6z" fill="rgba(255,255,255,0.4)" /><path d="M10 16l-1 4M14 16l-1 4" stroke="var(--accent-rain)" strokeWidth="1" /></svg>;
  const snow = <svg viewBox="0 0 24 24" style={style}><path d="M19 14H7a3 3 0 010-6c0-2 1-4 3-5 1-2 3-3 5-3 3 0 5 2 5 5 2 1 4 3 4 6z" fill="rgba(255,255,255,0.5)" /><circle cx="10" cy="18" r="1" fill="white" /><circle cx="14" cy="20" r="1" fill="white" /></svg>;
  const storm = <svg viewBox="0 0 24 24" style={style}><path d="M19 14H7a3 3 0 010-6c0-2 1-4 3-5 1-2 3-3 5-3 3 0 5 2 5 5 2 1 4 3 4 6z" fill="rgba(255,255,255,0.3)" /><path d="M13 10l-3 5h2l-2 4 5-4h-2l3-5z" fill="var(--accent-sun)" /></svg>;
  if (name === 'sun') return sun;
  if (name === 'rain') return rain;
  if (name === 'snow') return snow;
  if (name === 'storm') return storm;
  return cloud;
}
