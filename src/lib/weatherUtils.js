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
export function feelsLike(tempF, windSpeedStr, relativeHumidity) {
  const wind = parseFloat(windSpeedStr);

  if (tempF <= 50 && !isNaN(wind) && wind > 3) {
    return Math.round(35.74 + 0.6215 * tempF - 35.75 * wind ** 0.16 + 0.4275 * tempF * wind ** 0.16);
  }

  if (tempF >= 80) {
    const rh = relativeHumidity ?? 60;
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

export function getTimeGreeting(now, currentPeriod, todayHigh) {
  const h = now.getHours();
  const f = (currentPeriod?.shortForecast ?? "").toLowerCase();

  const condition =
    f.includes("thunder") || f.includes("storm")
      ? "thunder"
      : f.includes("ice") || f.includes("freezing")
      ? "ice"
      : f.includes("snow") || f.includes("sleet") || f.includes("blizzard")
      ? "snow"
      : f.includes("rain") || f.includes("shower") || f.includes("drizzle")
      ? "rain"
      : f.includes("fog") || f.includes("mist") || f.includes("haze")
      ? "fog"
      : f.includes("wind") || f.includes("breezy") || f.includes("gusty")
      ? "wind"
      : f.includes("cloud") || f.includes("overcast")
      ? "cloud"
      : todayHigh >= 95
      ? "hot"
      : todayHigh <= 32
      ? "cold"
      : todayHigh >= 80
      ? "warm"
      : "clear";

  const period =
    h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : h >= 17 && h < 21 ? "evening" : "night";

  const greeting = {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "Good night",
  }[period];

  const suffix = {
    thunder: {
      morning: "thunderstorms possible today.",
      afternoon: "thunderstorms possible.",
      evening: "storms moving through tonight.",
      night: "storms moving through overnight.",
    },
    ice: {
      morning: "icy conditions expected today.",
      afternoon: "watch for icy conditions.",
      evening: "watch for ice overnight.",
      night: "watch for ice overnight.",
    },
    snow: {
      morning: "snow expected today.",
      afternoon: "snow possible.",
      evening: "snow expected overnight.",
      night: "snow expected overnight.",
    },
    rain: {
      morning: "expect rain today.",
      afternoon: "showers possible.",
      evening: "expect rain tonight.",
      night: "rain overnight.",
    },
    fog: {
      morning: "foggy start today.",
      afternoon: "reduced visibility out there.",
      evening: "foggy night ahead.",
      night: "foggy out there.",
    },
    wind: {
      morning: "breezy today.",
      afternoon: "windy conditions today.",
      evening: "windy tonight.",
      night: "windy overnight.",
    },
    cloud: {
      morning: "mostly cloudy today.",
      afternoon: "cloudy skies.",
      evening: "cloudy tonight.",
      night: "cloudy overnight.",
    },
    hot: { morning: "it's going to be a hot one.", afternoon: "stay cool out there.", evening: null, night: null },
    cold: {
      morning: "bundle up today.",
      afternoon: "staying cold today.",
      evening: "cold night ahead.",
      night: "it's a cold one out there.",
    },
    warm: { morning: "warm day ahead.", afternoon: null, evening: null, night: null },
    clear: {
      morning: "clear skies ahead.",
      afternoon: null,
      evening: "clear tonight.",
      night: "clear skies overnight.",
    },
  }[condition]?.[period];

  return suffix ? `${greeting}, ${suffix}` : greeting;
}
