import { WEATHER_ICONS_BASE, WEATHER_ICONS_FALLBACK } from "./constants.js";

export function windDirectionToDegrees(dir) {
  if (!dir) return 0;
  const map = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5,
  };
  return map[dir.toUpperCase()] ?? 0;
}

/**
 * Apparent temperature (feels like) in °F.
 * - Wind chill: valid when tempF ≤ 50 and wind > 3 mph (NWS formula)
 * - Heat index: valid when tempF ≥ 80 (Rothfusz, humidity estimated at 60% — NWS doesn't provide it)
 * - Middle range: returns actual temp unchanged
 */
export function feelsLike(tempF, windSpeedStr) {
  const wind = parseFloat(windSpeedStr);

  if (tempF <= 50 && !isNaN(wind) && wind > 3) {
    return Math.round(35.74 + 0.6215 * tempF - 35.75 * wind ** 0.16 + 0.4275 * tempF * wind ** 0.16);
  }

  if (tempF >= 80) {
    const rh = 60; // estimated — NWS forecast endpoint omits humidity
    return Math.round(
      -42.379 +
        2.04901523 * tempF +
        10.14333127 * rh -
        0.22475541 * tempF * rh -
        0.00683783 * tempF ** 2 -
        0.05481717 * rh ** 2 +
        0.00122874 * tempF ** 2 * rh +
        0.00085282 * tempF * rh ** 2 -
        0.00000199 * tempF ** 2 * rh ** 2
    );
  }

  return tempF;
}

/** Map NWS shortForecast to Basmilius/Meteocons icon filename (svg-static) */
export function getWeatherIcon(shortForecast, isDaytime = true) {
  if (!shortForecast) return isDaytime ? "partly-cloudy-day" : "partly-cloudy-night";
  const f = shortForecast.toLowerCase();
  const tod = isDaytime ? "day" : "night";

  if (f.includes("thunder")) return "thunderstorms-rain";
  if (f.includes("snow")) return "snow";
  if (f.includes("sleet") || f.includes("ice")) return "sleet";
  if (f.includes("rain") || f.includes("shower")) return `partly-cloudy-${tod}-rain`;
  if (f.includes("drizzle")) return "drizzle";
  if (f.includes("fog") || f.includes("mist")) return "fog";
  if (f.includes("wind")) return "wind";
  if (f.includes("overcast")) return "cloudy";
  if (f.includes("mostly cloudy")) return "cloudy";
  if (f.includes("partly cloudy") || f.includes("partly sunny")) return `partly-cloudy-${tod}`;
  if (f.includes("mostly clear") || f.includes("mostly sunny")) return isDaytime ? "clear-day" : "clear-night";
  if (f.includes("clear") || f.includes("sunny")) return isDaytime ? "clear-day" : "clear-night";
  return `partly-cloudy-${tod}`;
}

function normalizeIconName(name) {
  return name === "thunderstorms-rain" ? "thunderstorm" : name;
}

export function weatherIconUrl(name) {
  return `${WEATHER_ICONS_BASE}/${normalizeIconName(name)}.svg`;
}

export function getWeatherIconFallbackUrl(name) {
  return `${WEATHER_ICONS_FALLBACK}/${normalizeIconName(name)}.svg`;
}

export function getGradientForCondition(shortForecast, isDaytime) {
  if (!shortForecast) return "var(--bg-base)";
  const s = shortForecast.toLowerCase();
  if (s.includes("thunder") || s.includes("storm"))
    return "linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #0a0f1e 100%)";
  if (s.includes("rain") || s.includes("drizzle"))
    return "linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #0a0f1e 100%)";
  if (s.includes("snow") || s.includes("sleet") || s.includes("ice"))
    return "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #0a0f1e 100%)";
  if ((s.includes("clear") || s.includes("sunny") || s.includes("mostly clear")) && !isDaytime)
    return "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0a0f1e 100%)";
  if (s.includes("cloud") || s.includes("overcast"))
    return "linear-gradient(135deg, #1e293b 0%, #334155 40%, #0a0f1e 100%)";
  if (s.includes("sunny") || s.includes("clear"))
    return "linear-gradient(135deg, #422006 0%, #78350f 30%, #0f172a 70%, #0a0f1e 100%)";
  return "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #0a0f1e 100%)";
}

export function getTimeGreeting(now, currentPeriod) {
  const h = now.getHours();
  const f = (currentPeriod?.shortForecast ?? "").toLowerCase();
  const hasRain = f.includes("rain") || f.includes("shower") || f.includes("drizzle") || f.includes("storm");
  const hasSnow = f.includes("snow") || f.includes("sleet") || f.includes("ice");

  if (h >= 5 && h < 12) {
    if (hasRain) return "Good morning, expect rain today.";
    if (hasSnow) return "Good morning, snow expected today.";
    return "Good morning, clear skies ahead.";
  }
  if (h >= 12 && h < 17) {
    if (hasRain) return "Good afternoon, showers possible.";
    if (hasSnow) return "Good afternoon, snow possible.";
    return "Good afternoon.";
  }
  if (hasRain) return "Good evening, expect rain tonight.";
  if (hasSnow) return "Good evening, snow expected tonight.";
  return "Good evening, clear tonight.";
}
