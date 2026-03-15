import { useState } from "react";
import { motion } from "framer-motion";
import { DayForecastRow } from "./DayForecastRow.jsx";

export function DayForecastList({ dayGroups, hourlyPeriods, unitPrimary }) {
  const [expandedDayIndex, setExpandedDayIndex] = useState(null);

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
