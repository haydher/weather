import { getWeatherIcon, weatherIconUrl, getWeatherIconFallbackUrl } from '../../lib/weatherUtils.js';

export function WeatherIcon({ shortForecast, isDaytime = true, size = 32, alt }) {
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
        t.src = getWeatherIconFallbackUrl(name);
      }}
    />
  );
}
