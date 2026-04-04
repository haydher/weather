/** US state full name → 2-letter abbreviation */
export const US_STATE_ABBR = {
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

export function abbreviateState(stateName) {
  if (!stateName) return '';
  const key = String(stateName).toLowerCase().trim();
  return US_STATE_ABBR[key] || (key.length <= 2 ? key.toUpperCase() : stateName);
}

export const STORAGE_KEY = 'weather-location';
export const DEBOUNCE_MS = 300;

export const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
export const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
export const IPAPI_URL = 'https://ipapi.co/json/';

export const WEATHER_ICONS_BASE = 'https://cdn.jsdelivr.net/gh/basmilius/weather-icons@2.0.0/production/fill/darksky';
export const WEATHER_ICONS_FALLBACK = 'https://cdn.jsdelivr.net/gh/basmilius/weather-icons@2.0.0/production/fill/darksky';

/** Sunrise / sunset (fill); darksky set does not include these names */
export const SUN_EVENT_ICONS_BASE = 'https://cdn.jsdelivr.net/gh/basmilius/weather-icons@2.0.0/production/fill/all';

export function isInUS(lat, lon) {
  return lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66;
}
