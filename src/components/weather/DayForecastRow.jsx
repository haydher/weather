import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fToC } from "../../lib/formatters.js";
import { formatTime } from "../../lib/formatters.js";
import { WeatherIcon } from "../ui/WeatherIcon.jsx";
import { HourlyCard } from "./HourlyCard.jsx";

export function DayForecastRow({ group, hourlyPeriods, expanded, onToggle, unitPrimary, index, isLast }) {
  const now = new Date();
  const high = group.dayPeriod?.temperature ?? group.nightPeriod?.temperature;
  const low = group.nightPeriod?.temperature ?? group.dayPeriod?.temperature;
  const hasOnlyOnePeriod = !group.dayPeriod || !group.nightPeriod;
  const precip =
    group.dayPeriod?.probabilityOfPrecipitation?.value ?? group.nightPeriod?.probabilityOfPrecipitation?.value ?? 0;
  const detailed = group.dayPeriod?.detailedForecast || group.nightPeriod?.detailedForecast || "";
  const shortForecast = group.dayPeriod?.shortForecast || group.nightPeriod?.shortForecast;

  const dayHours = useMemo(
    () => hourlyPeriods.filter((p) => new Date(p.startTime).toDateString() === group.day),
    [hourlyPeriods, group.day]
  );

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.06, duration: 0.35 }}
      style={{ marginBottom: !isLast ? 12 : 0 }}
    >
      <motion.div
        className="glass-card"
        style={{ overflow: "hidden", cursor: "pointer" }}
        onClick={() => onToggle(expanded ? null : index)}
      >
        <div className="forecast-row">
          <span className="day-name">{group.name}</span>
          <div className="forecast-icon-precip-container">
            <div className="forecast-icon-precip">
              <span className="precip-pct">{precip}%</span>
              <WeatherIcon shortForecast={shortForecast} isDaytime size={28} alt={shortForecast ?? ""} />
            </div>
            <div className="forecast-temps">
              {hasOnlyOnePeriod ? (
                <>
                  <span className="temp-high">{high}°</span>
                  {unitPrimary !== "C" && <span className="temp-celsius">({fToC(high)}°)</span>}
                </>
              ) : (
                <>
                  <span className="temp-high">{high}°</span>
                  <span className="temp-divider">/</span>
                  <span className="temp-low">{low}°</span>
                  {unitPrimary !== "C" && (
                    <span className="temp-celsius">
                      ({fToC(high)}°/{fToC(low)}°)
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                opacity: { duration: 0.1 },
                height: { duration: 0.25, ease: "easeInOut" },
              }}
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
                  {dayHours.map((p, hourIndex) => {
                    const start = new Date(p.startTime);
                    const end = new Date(p.endTime);
                    const isNow = now >= start && now < end;
                    return (
                      <HourlyCard
                        delay={0}
                        key={p.startTime}
                        period={p}
                        unitPrimary={unitPrimary}
                        formatTime={formatTime}
                        isNow={isNow}
                        size="sm"
                        index={hourIndex}
                      />
                    );
                  })}
                </div>
              )}
              <p style={{ margin: "0 16px 12px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {detailed}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.li>
  );
}
