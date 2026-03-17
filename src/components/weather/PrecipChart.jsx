import { useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Chart, CategoryScale, LinearScale, BarElement, BarController, Tooltip } from "chart.js";
import { formatTime } from "../../lib/formatters.js";

Chart.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip);

function buildSummary(hourlyPeriods) {
  const THRESHOLD = 20;
  let inRain = false;
  let startTime = null;
  let peak = 0;
  const segments = [];

  for (const p of hourlyPeriods) {
    const val = p.probabilityOfPrecipitation?.value ?? 0;
    if (val >= THRESHOLD && !inRain) {
      inRain = true;
      startTime = p.startTime;
      peak = val;
    } else if (val >= THRESHOLD) {
      peak = Math.max(peak, val);
    } else if (inRain) {
      inRain = false;
      segments.push({ start: startTime, end: p.startTime, peak });
      startTime = null;
      peak = 0;
    }
  }
  if (inRain) {
    segments.push({ start: startTime, end: null, peak });
  }

  if (!segments.length) return null;

  const intensity = (p) => (p >= 70 ? "heavy rain" : p >= 40 ? "rain" : "light rain");

  const parts = segments.map(({ start, end, peak }, i) => {
    const from = formatTime(start);
    const label = intensity(peak);
    const segment = end ? `${label} ${from} – ${formatTime(end)}` : `${label} from ${from} onwards`;
    return i === 0 ? segment[0].toUpperCase() + segment.slice(1) : segment;
  });

  // "Heavy rain 11 PM – 7 AM, then light rain 3 PM – 5 PM"
  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  return `${parts.join(", ")}, then ${last}.`;
}

function barColor(value) {
  if (value >= 70) return `rgba(80, 160, 255, ${0.4 + (value / 100) * 0.6})`;
  if (value >= 40) return `rgba(80, 160, 255, ${0.25 + (value / 100) * 0.5})`;
  return `rgba(80, 160, 255, ${0.1 + (value / 100) * 0.4})`;
}

export function PrecipChart({ hourlyPeriods, header, isLoading }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const precipData = useMemo(() => hourlyPeriods.map((p) => p.probabilityOfPrecipitation?.value ?? 0), [hourlyPeriods]);
  const hourlyLabels = useMemo(() => hourlyPeriods.map((p) => formatTime(p.startTime)), [hourlyPeriods]);

  const summary = useMemo(() => buildSummary(hourlyPeriods), [hourlyPeriods]);

  useEffect(() => {
    if (!hourlyLabels.length || !precipData.length || !chartRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = chartRef.current.getContext("2d");
    chartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: hourlyLabels,
        datasets: [
          {
            data: precipData,
            backgroundColor: precipData.map(barColor),
            borderWidth: 0,
            borderRadius: 3,
            borderSkipped: false,
          },
        ],
      },
      options: {
        animation: {
          delay: (ctx) => ctx.dataIndex * 15,
          duration: 500,
          easing: "easeOutQuart",
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "rgba(255,255,255,0.3)",
              font: { size: 10, family: "Nunito Sans" },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7,
            },
            border: { display: false },
          },
          y: {
            display: false,
            min: 0,
            max: 100,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        responsive: true,
        maintainAspectRatio: false,
        barPercentage: 0.7,
        categoryPercentage: 0.85,
      },
    });

    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [hourlyLabels, precipData]);

  if (isLoading) {
    return (
      <motion.div
        key="precip-skeleton"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="glass-card"
        style={{ padding: 16 }}
      >
        <div className="shimmer" style={{ height: 14, width: "45%", marginBottom: 8, borderRadius: 6 }} />
        <div className="shimmer" style={{ height: 11, width: "65%", borderRadius: 6 }} />

        <div style={{ height: 80, position: "relative", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: "100%" }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${30 + Math.sin(i * 0.8) * 20}%`,
                  borderRadius: 3,
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="shimmer" style={{ height: 14, width: "45%", marginBottom: 8, borderRadius: 6 }} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card"
      style={{ padding: 16 }}
    >
      <h3 className="weather-label" style={{ margin: "0 0 2px", fontSize: 14, color: "var(--text-primary)" }}>
        {header}
      </h3>
      {summary && (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)", opacity: 0.9 }}>{summary}</p>
      )}
      <div style={{ height: 80, position: "relative" }}>
        <canvas ref={chartRef} />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        {[
          { label: "Low", color: "rgba(80,160,255,0.25)" },
          { label: "Moderate", color: "rgba(80,160,255,0.5)" },
          { label: "High", color: "rgba(80,160,255,0.85)" },
        ].map(({ label, color }) => (
          <span
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.35)" }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>
    </motion.section>
  );
}
