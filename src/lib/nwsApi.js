const NWS_POINTS_BASE = 'https://api.weather.gov/points';

/**
 * Fetches NWS points and forecast data for a location.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{ points: object, forecast: object, forecastHourly: object }>}
 * @throws Will throw or reject with error message for non-US or API errors.
 */
export async function fetchForecastForLocation(lat, lon) {
  const pointsRes = await fetch(`${NWS_POINTS_BASE}/${lat},${lon}`, {
    headers: { Accept: 'application/json' },
  });

  if (!pointsRes.ok) {
    if (pointsRes.status === 404 || pointsRes.status >= 500) {
      throw new Error('NWS only covers US locations — try a US city');
    }
    throw new Error('NWS data unavailable');
  }

  const pointsData = await pointsRes.json();
  const props = pointsData?.properties;
  if (!props?.forecast || !props?.forecastHourly) {
    throw new Error('NWS data unavailable');
  }

  const [forecastRes, hourlyRes] = await Promise.all([
    fetch(props.forecast, { headers: { Accept: 'application/json' } }),
    fetch(props.forecastHourly, { headers: { Accept: 'application/json' } }),
  ]);
  const [forecast, forecastHourly] = await Promise.all([
    forecastRes.json(),
    hourlyRes.json(),
  ]);

  return { points: pointsData, forecast, forecastHourly };
}
