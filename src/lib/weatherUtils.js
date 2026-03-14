import { WEATHER_ICONS_BASE, WEATHER_ICONS_FALLBACK } from './constants.js';

export function windDirectionToDegrees(dir) {
  if (!dir) return 0;
  const map = { N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5 };
  return map[dir.toUpperCase()] ?? 0;
}

/** Map NWS shortForecast to Basmilius/Meteocons icon filename (svg-static) */
export function getWeatherIcon(shortForecast, isDaytime = true) {
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

export function weatherIconUrl(name) {
  const file = name === 'thunderstorms-rain' ? 'thunderstorm' : name;
  return `${WEATHER_ICONS_BASE}/${file}.svg`;
}

export function getWeatherIconFallbackUrl(name) {
  const file = name === 'thunderstorms-rain' ? 'thunderstorm' : name;
  return `${WEATHER_ICONS_FALLBACK}/${file}.svg`;
}

export function getGradientForCondition(shortForecast, isDaytime) {
  if (!shortForecast) return 'var(--bg-base)';
  const s = shortForecast.toLowerCase();
  if (s.includes('rain') || s.includes('drizzle') || s.includes('storm')) return 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #0a0f1e 100%)';
  if (s.includes('snow')) return 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #0a0f1e 100%)';
  if (s.includes('clear') && !isDaytime) return 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0a0f1e 100%)';
  if (s.includes('cloud') || s.includes('overcast')) return 'linear-gradient(135deg, #1e293b 0%, #334155 40%, #0a0f1e 100%)';
  if (s.includes('sunny') || s.includes('clear')) return 'linear-gradient(135deg, #422006 0%, #78350f 30%, #0f172a 70%, #0a0f1e 100%)';
  return 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #0a0f1e 100%)';
}

export function getTimeGreeting(now, currentPeriod) {
  const h = now.getHours();
  const s = currentPeriod?.shortForecast ?? '';
  const lower = s.toLowerCase();
  if (h >= 5 && h < 12) return lower.includes('rain') || lower.includes('snow') ? 'Good morning, expect rain today.' : 'Good morning, clear skies ahead.';
  if (h >= 12 && h < 17) return lower.includes('rain') || lower.includes('snow') ? 'Good afternoon, showers possible.' : 'Good afternoon.';
  return lower.includes('rain') || lower.includes('snow') ? 'Good evening, expect rain tonight.' : 'Good evening, clear tonight.';
}
