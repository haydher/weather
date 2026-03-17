import { motion } from "framer-motion";
import { formatTime } from "../../lib/formatters.js";
import { HourlyCard } from "./HourlyCard.jsx";

export function HourlyStrip({ hourlyPeriods, unitPrimary, isLoading }) {
  if (isLoading) {
    return (
      <motion.section
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        style={{ overflow: "visible" }}
      >
        <h2 className="weather-label" style={{ margin: "0 0 12px", fontFamily: "var(--font-display)", fontSize: 18 }}>
          Hourly
        </h2>
        <div style={{ margin: "0 -16px" }}>
          <div
            className="hide-scrollbar"
            style={{ display: "flex", gap: 10, overflowX: "hidden", paddingLeft: 16, paddingRight: 16 }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  flex: "0 0 72px",
                  minWidth: 72,
                  height: 120,
                  borderRadius: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 8px",
                }}
              >
                <div className="shimmer" style={{ height: 10, width: 32, borderRadius: 4 }} />
                <div className="shimmer" style={{ height: 32, width: 32, borderRadius: 8 }} />
                <div className="shimmer" style={{ height: 18, width: 40, borderRadius: 4 }} />
                <div className="shimmer" style={{ height: 10, width: 28, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    );
  }

  const now = new Date();
  const periods = hourlyPeriods.slice(0, 24);

  return (
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25, duration: 0.35 }}
      style={{ overflow: "visible" }}
    >
      <h2 className="weather-label" style={{ margin: "0 0 12px", fontFamily: "var(--font-display)", fontSize: 18 }}>
        Hourly
      </h2>
      <div style={{ margin: "0 -16px", overflow: "visible" }}>
        <div
          className="hide-scrollbar"
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingRight: 16,
            paddingLeft: 16,
          }}
        >
          {periods.map((p, i) => {
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
                size="md"
                index={i}
              />
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
