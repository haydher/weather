import { motion, AnimatePresence } from "framer-motion";
import { getGradientForCondition, feelsLike } from "../../lib/weatherUtils.js";
import { fToC } from "../../lib/formatters.js";
import { TemperatureDisplay } from "../ui/TemperatureDisplay.jsx";
import { WeatherIcon } from "../ui/WeatherIcon.jsx";
import { WindArrow } from "../ui/WindArrow.jsx";
import { UnitToggle } from "../ui/UnitToggle.jsx";

export function HeroCard({ isLoading, currentPeriod, todayHigh, todayLow, unitPrimary, setUnitPrimary, timeGreeting }) {
  if (isLoading) {
    return (
      <motion.div
        key="hero-skeleton"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="glass-card"
        style={{ padding: 24, minHeight: 260 }}
      >
        <div className="shimmer" style={{ height: 20, width: "70%", marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 72, width: "50%", marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 24, width: "35%", marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 24, width: "20%", marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 24, width: "40%" }} />
      </motion.div>
    );
  }

  if (!currentPeriod) return null;

  const feelsLikeF = feelsLike(currentPeriod.temperature, currentPeriod.windSpeed);
  const feelsLikeC = fToC(feelsLikeF);

  return (
    <motion.div
      key="hero"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="glass-card hero-card"
      style={{
        padding: 20,
        background: getGradientForCondition(currentPeriod.shortForecast, currentPeriod.isDaytime),
        backgroundSize: "200% 200%",
        transition: "background 2s ease",
      }}
    >
      <p
        className="hero-greeting"
        style={{
          margin: "0 0 12px",
          fontSize: 13,
          fontStyle: "italic",
          opacity: 0.6,
          fontFamily: "var(--font-body)",
        }}
      >
        {timeGreeting}
      </p>

      <div className="hero-left">
        <TemperatureDisplay value={currentPeriod.temperature} unitPrimary={unitPrimary} />

        <p style={{ margin: "8px 0", fontSize: 14, color: "var(--text-secondary)" }}>
          Feels like {unitPrimary === "F" ? feelsLikeF : feelsLikeC}°{unitPrimary} (
          {unitPrimary === "F" ? feelsLikeC : feelsLikeF}°{unitPrimary === "F" ? "C" : "F"})
        </p>

        <span style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: 4 }}>
          <WindArrow size={15} direction="N" /> {todayHigh}° /
          <WindArrow size={15} direction="S" /> {todayLow}°
        </span>
      </div>
      <div className="hero-icon">
        <WeatherIcon
          shortForecast={currentPeriod.shortForecast}
          isDaytime={currentPeriod.isDaytime}
          size={140}
          alt={currentPeriod.shortForecast}
        />
      </div>
      <div className="hero-bottom-row">
        {currentPeriod.windSpeed ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <WindArrow direction={currentPeriod.windDirection} />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{currentPeriod.windSpeed}</span>
          </div>
        ) : (
          <span />
        )}
        <UnitToggle unitPrimary={unitPrimary} onChange={setUnitPrimary} />
      </div>
    </motion.div>
  );
}
