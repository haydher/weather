import { motion, AnimatePresence } from "framer-motion";
import { fToC } from "../../lib/formatters.js";
import { formatTime } from "../../lib/formatters.js";
import { WeatherIcon } from "../ui/WeatherIcon.jsx";
import { HourlyCard } from "./HourlyCard.jsx";

export function DayForecastRow({ group, hourlyPeriods, expanded, onToggle, unitPrimary, index, isLast }) {
  const now = new Date();
  const high = group.dayPeriod?.temperature ?? group.nightPeriod?.temperature;
  const low = group.nightPeriod?.temperature ?? group.dayPeriod?.temperature;
  const precip =
    group.dayPeriod?.probabilityOfPrecipitation?.value ?? group.nightPeriod?.probabilityOfPrecipitation?.value ?? 0;
  const detailed = group.dayPeriod?.detailedForecast || group.nightPeriod?.detailedForecast || "";
  const wind = group.dayPeriod?.windSpeed || group.nightPeriod?.windSpeed || "";
  const windDir = group.dayPeriod?.windDirection || group.nightPeriod?.windDirection || "";
  const shortForecast = group.dayPeriod?.shortForecast || group.nightPeriod?.shortForecast;
  const dayHours = hourlyPeriods.filter((p) => new Date(p.startTime).toDateString() === group.day);

  return (
    <motion.li
      key={group.day}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.06, duration: 0.35 }}
      style={{ marginBottom: !isLast ? 12 : 0 }}
    >
      <motion.div
        className="glass-card"
        style={{ overflow: "hidden", cursor: "pointer" }}
        onClick={() => onToggle(expanded ? null : index)}
        layout
      >
        <div className="forecast-row">
          <span className="day-name">{group.name}</span>
          <div className="forecast-icon-precip-container">
            <div className="forecast-icon-precip">
              <span className="precip-pct">{precip}%</span>
              <WeatherIcon shortForecast={shortForecast} isDaytime size={28} alt="" />
            </div>
            <div className="forecast-temps">
              <span className="temp-high">{high}°</span>
              <span className="temp-divider">/</span>
              <span className="temp-low">{low}°</span>
              <span className="temp-celsius">
                ({fToC(high)}°/{fToC(low)}°)
              </span>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              {dayHours.length > 0 && (
                <div
                  className="hide-scrollbar ten-day-hourly-card"
                  style={{
                    display: "flex",
                    gap: 8,
                    overflowX: "auto",
                    scrollSnapType: "x mandatory",
                    padding: "12px 16px 8px",
                  }}
                >
                  {dayHours.map((p, index) => {
                    const start = new Date(p.startTime);
                    const end = new Date(p.endTime);
                    const isNow = now >= start && now < end && start.toDateString() === now.toDateString();
                    return (
                      <HourlyCard
                        key={p.startTime}
                        period={p}
                        unitPrimary={unitPrimary}
                        formatTime={formatTime}
                        isNow={isNow}
                        size="sm"
                        index={index}
                      />
                    );
                  })}
                </div>
              )}
              <p style={{ margin: "0 16px 12px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {detailed}
              </p>
              {(wind || windDir) && (
                <p style={{ margin: "0 16px 12px", fontSize: 13, color: "var(--text-secondary)" }}>
                  Wind: {wind} {windDir}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.li>
  );
}
