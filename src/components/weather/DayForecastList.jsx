import { useState } from "react";
import { motion } from "framer-motion";
import { DayForecastRow } from "./DayForecastRow.jsx";

export function DayForecastList({ dayGroups, hourlyPeriods, unitPrimary, isLoading }) {
  const [expandedDayIndex, setExpandedDayIndex] = useState(null);

  if (isLoading) {
    return (
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.35 }}>
        <h2 className="weather-label" style={{ margin: "0 0 12px", fontFamily: "var(--font-display)", fontSize: 18 }}>
          7-Day Forecast
        </h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.35 }}
              style={{ marginBottom: i < 6 ? 12 : 0 }}
            >
              <div
                className="glass-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  gap: 12,
                  minHeight: 52,
                }}
              >
                <div className="shimmer" style={{ height: 14, width: 36, borderRadius: 4 }} />
                <div style={{ flex: 1 }} />
                <div className="shimmer" style={{ height: 12, width: 24, borderRadius: 4 }} />
                <div className="shimmer" style={{ height: 28, width: 28, borderRadius: 8, marginLeft: 8 }} />
                <div className="shimmer" style={{ height: 14, width: 80, borderRadius: 4, marginLeft: 8 }} />
              </div>
            </motion.li>
          ))}
        </ul>
      </motion.section>
    );
  }

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
      <h2 className="weather-label" style={{ margin: "0 0 12px", fontFamily: "var(--font-display)", fontSize: 18 }}>
        7-Day Forecast
      </h2>
      <ul
        style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}
        className="forecast-list"
      >
        {dayGroups.map((group, idx) => (
          <DayForecastRow
            key={group.day}
            group={group}
            hourlyPeriods={hourlyPeriods}
            expanded={expandedDayIndex === idx}
            onToggle={setExpandedDayIndex}
            unitPrimary={unitPrimary}
            index={idx}
            isLast={idx === dayGroups.length - 1}
          />
        ))}
      </ul>
    </motion.section>
  );
}
