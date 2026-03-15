import { NOMINATIM_SEARCH, NOMINATIM_REVERSE, abbreviateState, isInUS } from "./constants.js";

export async function reverseGeocode(lat, lon) {
  const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": "WeatherApp/2.0" } });
  const data = await res.json();
  const addr = data?.address || {};
  const city = addr.city || addr.town || addr.village || addr.municipality || "";
  const stateAbbr = addr.state_code || abbreviateState(addr.state) || "";
  const displayName = [city, stateAbbr].filter(Boolean).length
    ? `${city}, ${stateAbbr}`.trim()
    : data?.display_name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  return { lat, lon, displayName };
}

export async function searchPlaces(query) {
  if (!query?.trim()) return [];
  const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(query.trim())}&format=json&addressdetails=1&countrycodes=us`;
  const res = await fetch(url, { headers: { "User-Agent": "WeatherApp/2.0" } });
  const data = await res.json();
  const list = Array.isArray(data)
    ? data.filter((r) => r.lat && r.lon && isInUS(parseFloat(r.lat), parseFloat(r.lon)))
    : [];
  return list;
}
