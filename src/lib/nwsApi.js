const NWS_POINTS_BASE = "https://api.weather.gov/points";

async function fetchOpenMeteoDailySun(lat, lon, timeZone) {
  if (!timeZone) return null;
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: "sunrise,sunset",
      timezone: timeZone,
      forecast_days: "16",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) return null;
    const j = await res.json();
    const d = j.daily;
    if (!d?.time?.length || !d.sunrise?.length || !d.sunset?.length) return null;
    return { dates: d.time, sunrise: d.sunrise, sunset: d.sunset };
  } catch {
    return null;
  }
}

export async function fetchForecastForLocation(lat, lon) {
  const pointsRes = await fetch(`${NWS_POINTS_BASE}/${lat},${lon}`, {
    headers: { Accept: "application/json" },
  });

  if (!pointsRes.ok) {
    if (pointsRes.status === 404 || pointsRes.status >= 500) {
      throw new Error("NWS only covers US locations — try a US city");
    }
    throw new Error("NWS data unavailable");
  }

  const pointsData = await pointsRes.json();
  const props = pointsData?.properties;
  if (!props?.forecast || !props?.forecastHourly) {
    throw new Error("NWS data unavailable");
  }

  const [forecastRes, hourlyRes, alertsRes, sunDaily] = await Promise.all([
    fetch(props.forecast, { headers: { Accept: "application/json" } }),
    fetch(props.forecastHourly, { headers: { Accept: "application/json" } }),
    fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
      headers: { Accept: "application/json" },
    }),
    fetchOpenMeteoDailySun(lat, lon, props.timeZone),
  ]);

  const [forecast, forecastHourly, alertsData] = await Promise.all([
    forecastRes.json(),
    hourlyRes.json(),
    alertsRes.ok ? alertsRes.json() : Promise.resolve({ features: [] }),
  ]);

  const alerts = (alertsData.features ?? []).map((f) => f.properties);

  return { points: pointsData, forecast, forecastHourly, alerts, sunDaily };
}
