const NWS_POINTS_BASE = "https://api.weather.gov/points";

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

  const [forecastRes, hourlyRes, alertsRes] = await Promise.all([
    fetch(props.forecast, { headers: { Accept: "application/json" } }),
    fetch(props.forecastHourly, { headers: { Accept: "application/json" } }),
    fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
      headers: { Accept: "application/json" },
    }),
  ]);

  const [forecast, forecastHourly, alertsData] = await Promise.all([
    forecastRes.json(),
    hourlyRes.json(),
    alertsRes.ok ? alertsRes.json() : Promise.resolve({ features: [] }),
  ]);

  const alerts = (alertsData.features ?? []).map((f) => f.properties);

  return { points: pointsData, forecast, forecastHourly, alerts };
}
