/** Offset suffix from first NWS hourly period on this calendar day (handles DST). */
export function getIsoOffsetForDay(dayKey, hourlyPeriods) {
  if (!dayKey || !hourlyPeriods?.length) return null;
  const p = hourlyPeriods.find((x) => typeof x.startTime === "string" && x.startTime.startsWith(dayKey));
  if (!p?.startTime) return null;
  const m = p.startTime.match(/(Z|[+-]\d{2}:\d{2})$/);
  if (!m) return null;
  return m[1];
}

function parseLocalDateTimeWithOffset(localPart, offsetSuffix) {
  if (!localPart || !offsetSuffix) return null;
  const trimmed = localPart.replace(/Z|[+-]\d{2}:?\d{2}$/, "");
  const withSecs = /T\d{2}:\d{2}:\d{2}$/.test(trimmed) ? trimmed : `${trimmed}:00`;
  const suffix = offsetSuffix === "Z" ? "Z" : offsetSuffix;
  const ms = Date.parse(withSecs + suffix);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/**
 * @param {{ dates: string[]; sunrise: string[]; sunset: string[] } | null} daily - Open-Meteo daily payload
 * @param {Array<{ startTime: string }>} hourlyPeriods
 * @returns {Record<string, { sunrise: Date; sunset: Date }> | null}
 */
export function resolveSunDatesByDay(daily, hourlyPeriods) {
  if (!daily?.dates?.length || !hourlyPeriods?.length) return null;
  const { dates, sunrise, sunset } = daily;
  const byDay = Object.create(null);
  for (let i = 0; i < dates.length; i++) {
    const day = dates[i];
    const offset = getIsoOffsetForDay(day, hourlyPeriods);
    if (!offset) continue;
    const sr = parseLocalDateTimeWithOffset(sunrise[i], offset);
    const ss = parseLocalDateTimeWithOffset(sunset[i], offset);
    if (sr && ss) byDay[day] = { sunrise: sr, sunset: ss };
  }
  return Object.keys(byDay).length ? byDay : null;
}

export function sunEventsForPeriod(period, sunByDay) {
  if (!sunByDay || !period?.startTime || !period?.endTime) {
    return { sunriseAt: null, sunsetAt: null };
  }
  const day = period.startTime.slice(0, 10);
  const t = sunByDay[day];
  if (!t) return { sunriseAt: null, sunsetAt: null };
  const start = new Date(period.startTime).getTime();
  const end = new Date(period.endTime).getTime();
  let sunriseAt = null;
  let sunsetAt = null;
  const sr = t.sunrise instanceof Date ? t.sunrise.getTime() : NaN;
  const ss = t.sunset instanceof Date ? t.sunset.getTime() : NaN;
  if (Number.isFinite(sr) && sr >= start && sr < end) sunriseAt = t.sunrise;
  if (Number.isFinite(ss) && ss >= start && ss < end) sunsetAt = t.sunset;
  return { sunriseAt, sunsetAt };
}
