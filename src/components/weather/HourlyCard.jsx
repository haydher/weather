import { motion } from "framer-motion";
import { fToC } from "../../lib/formatters.js";
import { WeatherIcon } from "../ui/WeatherIcon.jsx";

const sizeStyles = {
  sm: {
    card: { flex: "0 0 60px", minWidth: 65, height: 56 },
    time: { fontSize: 10 },
    temp: { fontSize: 13 },
    iconSize: 30,
  },
  md: {
    card: { flex: "0 0 72px", minWidth: 72, height: 120 },
    time: { fontSize: 11 },
    temp: { fontSize: 18 },
    iconSize: 32,
  },
};

export function HourlyCard({ period, unitPrimary, formatTime, isNow, size = "md", index = 0, delay = 0.3 }) {
  const style = sizeStyles[size] ?? sizeStyles.md;
  const isFahrenheit = unitPrimary === "F";
  const tempDisplay = isFahrenheit ? period.temperature : fToC(period.temperature);
  const secondaryTemp = isFahrenheit ? fToC(period.temperature) : period.temperature;
  const secondaryUnit = isFahrenheit ? "C" : "F";
  const precip = period.probabilityOfPrecipitation?.value ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay + index * 0.05, duration: 0.25, ease: "easeOut" }}
      className="glass-card"
      style={{
        ...style.card,
        scrollSnapAlign: "start",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--border-glass)",
        borderRadius: "16px",
        padding: size === "sm" ? "40px 8px" : "70px 8px",
      }}
    >
      <div style={{ ...style.time, color: "var(--text-secondary)", marginBottom: size === "sm" ? 2 : 4 }}>
        {isNow ? "Now" : formatTime(period.startTime)}
      </div>
      <WeatherIcon shortForecast={period.shortForecast} isDaytime={period.isDaytime} size={style.iconSize} />
      <div style={{ fontFamily: "var(--font-display)", ...style.temp, fontWeight: 300, fontSize: 16 }}>
        {tempDisplay}°{unitPrimary}
      </div>
      {size === "md" && (
        <>
          <div style={{ fontSize: 11, opacity: 0.55, fontSize: 12 }}>
            {secondaryTemp}°{secondaryUnit}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{precip}%</div>
        </>
      )}
    </motion.div>
  );
}
