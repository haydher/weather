import { motion } from "framer-motion";
import { formatTime } from "../../lib/formatters.js";
import { sunEventsForPeriod } from "../../lib/sunTimes.js";
import { HourlyCard } from "./HourlyCard.jsx";

// Safari-safe: use translateZ(0) to force GPU layer,
// and avoid x/y on elements inside scroll containers
const safariSafeSection = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay: 0.25, duration: 0.35 },
  // Force GPU compositing layer — critical for Safari
  style: { overflow: "visible", transform: "translateZ(0)", WebkitTransform: "translateZ(0)" },
};

export function HourlyStrip({ hourlyPeriods, unitPrimary, isLoading, sunByDay }) {
  if (isLoading) {
    return (
      <motion.section
        initial={safariSafeSection.initial}
        animate={safariSafeSection.animate}
        transition={{ delay: 0.15, duration: 0.35 }}
        style={safariSafeSection.style}
      >
        {/* ...skeleton unchanged... */}
      </motion.section>
    );
  }

  const now = new Date();
  const periods = hourlyPeriods.slice(0, 24);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.25, duration: 0.35 }}
      style={{ overflow: "visible", transform: "translateZ(0)", WebkitTransform: "translateZ(0)" }}
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
            // Prevent Safari from re-compositing the scroll container on each frame
            WebkitOverflowScrolling: "touch",
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
          }}
        >
          {periods.map((p, i) => {
            const start = new Date(p.startTime);
            const end = new Date(p.endTime);
            const isNow = now >= start && now < end && start.toDateString() === now.toDateString();
            const { sunriseAt, sunsetAt } = sunEventsForPeriod(p, sunByDay);
            return (
              <HourlyCard
                key={p.startTime}
                period={p}
                unitPrimary={unitPrimary}
                formatTime={formatTime}
                isNow={isNow}
                size="md"
                index={i}
                sunriseAt={sunriseAt}
                sunsetAt={sunsetAt}
              />
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
