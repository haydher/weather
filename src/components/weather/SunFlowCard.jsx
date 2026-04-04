import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { formatTime } from "../../lib/formatters.js";
import { WEATHER_ICONS_BASE } from "../../lib/constants.js";

const VB_W = 320;
const VB_H = 110;
const BASE_Y = 92; // horizon / resting y
const AMP = 66; // how high the peak rises above baseline
const SIGMA = 0.2; // bell width — larger = softer / wider curve
const SUN_ICON = 30;
const SUN_ICON_SRC = `${WEATHER_ICONS_BASE}/clear-day.svg`;

/**
 * Soft Gaussian bell centered at solar noon (t = 0.5).
 * t runs from 0 (midnight) → 1 (midnight next day).
 */
function bell(t) {
  return Math.exp(-((t - 0.5) ** 2) / (2 * SIGMA ** 2));
}

function getSunY(t) {
  // Lower y  = higher on screen (SVG coords)
  return BASE_Y - AMP * bell(t);
}

function buildPath() {
  const n = 240;
  const segs = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (t * VB_W).toFixed(2);
    const y = getSunY(t).toFixed(2);
    segs.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
  }
  return segs.join(" ");
}

// Build once — shape never changes, only the sun moves
const STROKE_PATH = buildPath();

export function SunFlowCard({ sunrise, sunset, isLoading }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const derived = useMemo(() => {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const midnight = dayStart.getTime();
    const msInDay = 86400000;

    const srFrac = sunrise ? (sunrise.getTime() - midnight) / msInDay : 0.25;
    const ssFrac = sunset ? (sunset.getTime() - midnight) / msInDay : 0.75;

    const tNow = Math.max(0, Math.min(1, (now - midnight) / msInDay));
    const px = tNow * VB_W;
    const py = getSunY(tNow);
    const isDay = tNow >= srFrac && tNow <= ssFrac;

    const dlMs = sunrise && sunset ? sunset.getTime() - sunrise.getTime() : 0;
    const dlH = Math.floor(dlMs / 3_600_000);
    const dlM = Math.floor((dlMs % 3_600_000) / 60_000);
    const daylightStr = dlMs > 0 ? `${dlH}h ${dlM}m` : null;

    return { srFrac, ssFrac, px, py, isDay, daylightStr };
  }, [sunrise, sunset, now]);

  if (isLoading) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.35 }}
        className="glass-card"
        style={cardStyle}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div className="shimmer" style={{ height: 13, width: 44, borderRadius: 5 }} />
          <div className="shimmer" style={{ height: 13, width: 90, borderRadius: 5 }} />
        </div>
        <div className="shimmer" style={{ height: VB_H, width: "100%", borderRadius: 10 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <div className="shimmer" style={{ height: 36, width: "36%", borderRadius: 8 }} />
          <div className="shimmer" style={{ height: 36, width: "36%", borderRadius: 8 }} />
        </div>
      </motion.section>
    );
  }

  const { srFrac, ssFrac, px, py, isDay, daylightStr } = derived;

  const srLabel = sunrise ? formatTime(sunrise.getTime()) : "—";
  const ssLabel = sunset ? formatTime(sunset.getTime()) : "—";

  // Gradient stop positions as percentages along the X axis
  const srPct = `${(srFrac * 100).toFixed(1)}%`;
  const midPct = `${(((srFrac + ssFrac) / 2) * 100).toFixed(1)}%`;
  const ssPct = `${(ssFrac * 100).toFixed(1)}%`;

  // Sunrise / sunset X positions for tick marks
  const srX = srFrac * VB_W;
  const ssX = ssFrac * VB_W;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.35 }}
      className="glass-card"
      style={cardStyle}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        {daylightStr && <span style={daylightStyle}>{daylightStr} daylight</span>}
      </div>

      {/* Arc SVG */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        height={VB_H}
        style={{ display: "block", overflow: "visible" }}
        aria-hidden
      >
        <defs>
          {/*
            Arc gradient: both night ends are dim/cool,
            sunrise = amber, solar noon = bright warm white,
            sunset = orange, then back to dim.
          */}
          <linearGradient id="sfArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset={srPct} stopColor="#fbbf24" stopOpacity="0.90" />
            <stop offset={midPct} stopColor="#fef08a" stopOpacity="1.00" />
            <stop offset={ssPct} stopColor="#f97316" stopOpacity="0.90" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.25" />
          </linearGradient>

          {/* Sun glow radial */}
          <radialGradient id="sfSunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.50" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.00" />
          </radialGradient>

          {/* Subtle horizon fade */}
          <linearGradient id="sfHorizon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.00" />
            <stop offset="10%" stopColor="#94a3b8" stopOpacity="0.15" />
            <stop offset="90%" stopColor="#94a3b8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Horizon baseline */}
        <line x1={0} y1={BASE_Y} x2={VB_W} y2={BASE_Y} stroke="url(#sfHorizon)" strokeWidth={0.75} />

        {/* Sunrise tick */}
        <line
          x1={srX}
          y1={BASE_Y - 4}
          x2={srX}
          y2={BASE_Y + 4}
          stroke="#fbbf24"
          strokeOpacity={0.5}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* Sunset tick */}
        <line
          x1={ssX}
          y1={BASE_Y - 4}
          x2={ssX}
          y2={BASE_Y + 4}
          stroke="#f97316"
          strokeOpacity={0.5}
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        {/* Main bell-curve arc */}
        <path
          d={STROKE_PATH}
          fill="none"
          stroke="url(#sfArcGrad)"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Glow halo behind sun */}
        <motion.g
          initial={false}
          animate={{ x: px, y: py, opacity: isDay ? 0.9 : 0.25 }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        >
          <circle cx={0} cy={0} r={22} fill="url(#sfSunGlow)" />
        </motion.g>

        {/* Sun icon */}
        <motion.g
          initial={false}
          animate={{
            x: px - SUN_ICON / 2,
            y: py - SUN_ICON / 2,
            opacity: isDay ? 1 : 0.55,
          }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        >
          <image href={SUN_ICON_SRC} width={SUN_ICON} height={SUN_ICON} preserveAspectRatio="xMidYMid meet" />
        </motion.g>
      </svg>

      {/* Bottom labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginTop: 6,
          paddingLeft: 2,
          paddingRight: 2,
        }}
      >
        <div>
          <div style={bottomLabelStyle}>Sunrise</div>
          <div style={{ ...timeStyle, color: "#fbbf24" }}>{srLabel}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={bottomLabelStyle}>Sunset</div>
          <div style={{ ...timeStyle, color: "#f97316" }}>{ssLabel}</div>
        </div>
      </div>
    </motion.section>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const cardStyle = {
  padding: "14px 16px 14px",
  transform: "translateZ(0)",
  WebkitTransform: "translateZ(0)",
};

const headerLabelStyle = {
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-display)",
  opacity: 0.7,
};

const daylightStyle = {
  fontSize: 11,
  color: "var(--text-secondary)",
  fontFamily: "var(--font-body)",
  opacity: 0.6,
  letterSpacing: "0.02em",
};

const bottomLabelStyle = {
  fontSize: 11,
  color: "var(--text-secondary)",
  marginBottom: 3,
  fontFamily: "var(--font-display)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  opacity: 0.65,
};

const timeStyle = {
  fontSize: 15,
  fontWeight: 600,
  fontFamily: "var(--font-body)",
};
