import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SEVERITY_STYLES = {
  Extreme: {
    bg: "rgba(220, 38, 38, 0.15)",
    border: "rgba(220, 38, 38, 0.5)",
    badge: "rgba(220, 38, 38, 0.3)",
    dot: "#ef4444",
    pulse: true,
  },
  Severe: {
    bg: "rgba(234, 88, 12, 0.15)",
    border: "rgba(234, 88, 12, 0.5)",
    badge: "rgba(234, 88, 12, 0.3)",
    dot: "#f97316",
    pulse: true,
  },
  Moderate: {
    bg: "rgba(202, 138, 4, 0.12)",
    border: "rgba(202, 138, 4, 0.45)",
    badge: "rgba(202, 138, 4, 0.25)",
    dot: "#eab308",
    pulse: false,
  },
  Minor: {
    bg: "rgba(79, 163, 224, 0.10)",
    border: "rgba(79, 163, 224, 0.35)",
    badge: "rgba(79, 163, 224, 0.2)",
    dot: "#4fa3e0",
    pulse: false,
  },
};

function formatAlertTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/** Renders a string with URLs turned into clickable links */
function TextWithLinks({ text, style }) {
  const URL_REGEX = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(URL_REGEX);
  const urlPattern = /^https?:\/\//;

  return (
    <span style={style}>
      {parts.map((part, i) =>
        urlPattern.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              color: "#4fa3e0",
              textDecoration: "underline",
              wordBreak: "break-all",
              cursor: "pointer",
            }}
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </span>
  );
}

/**
 * Parses NWS description format:
 *   "* WHAT...Heavy snow expected.\n\n* WHERE...Northern MA."
 * into an array of { label, body } objects.
 * Lines that don't match the pattern are returned as plain paragraphs.
 */
function parseDescription(description) {
  if (!description) return [];

  // Split on the NWS "* LABEL..." pattern
  const sectionRegex = /^\*\s+([^.]+)\.\.\./m;
  const rawSections = description
    .split(/(?=^\*\s)/m)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawSections.length <= 1 && !sectionRegex.test(description)) {
    // No structured sections — just return as plain paragraphs
    return description
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((p) => ({ label: null, body: p.trim() }));
  }

  return rawSections.map((section) => {
    const match = section.match(/^\*\s+([^.]+)\.\.\.([\s\S]*)/);
    if (!match) return { label: null, body: section };
    const label = match[1].trim();
    const body = match[2].trim();
    return { label, body };
  });
}

function FormattedDescription({ description }) {
  const sections = parseDescription(description);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sections.map((s, i) => (
        <div key={i}>
          {s.label && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.75)",
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
          )}
          <TextWithLinks
            text={s.body}
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              opacity: 0.85,
              display: "block",
              whiteSpace: "pre-wrap",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function AlertCard({ alert, index }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.Minor;
  const expires = alert.expires ? `Expires ${formatAlertTime(alert.expires)}` : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.1, duration: 0.35 }}
      style={{
        borderRadius: 16,
        border: `1px solid ${sev.border}`,
        background: sev.bg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        cursor: "pointer",
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: sev.dot,
            flexShrink: 0,
            boxShadow: sev.pulse ? `0 0 6px ${sev.dot}` : "none",
            animation: sev.pulse ? "alertPulse 1.6s ease-in-out infinite" : "none",
          }}
        />
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "var(--font-body)",
            color: "var(--text-primary)",
          }}
        >
          {alert.event}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 20,
            background: sev.badge,
            color: "var(--text-primary)",
            opacity: 0.85,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {alert.severity}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: 12, opacity: 0.5, lineHeight: 1, flexShrink: 0 }}
        >
          ▾
        </motion.span>
      </div>

      {/* Headline always visible */}
      {alert.headline && (
        <p
          style={{ margin: "0 16px 10px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, opacity: 0.8 }}
        >
          {alert.headline}
        </p>
      )}

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.25, ease: "easeInOut" },
              opacity: { duration: 0.15 },
            }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "0 16px 14px",
                borderTop: `1px solid ${sev.border}`,
                marginTop: 4,
              }}
            >
              {expires && (
                <p
                  style={{
                    margin: "10px 0 8px",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    opacity: 0.9,
                  }}
                >
                  {expires}
                </p>
              )}
              {alert.areaDesc && (
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-secondary)", opacity: 0.7 }}>
                  📍 {alert.areaDesc}
                </p>
              )}
              {alert.description && <FormattedDescription description={alert.description} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function WeatherAlerts({ alerts }) {
  if (!alerts?.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      {alerts.map((alert, i) => (
        <AlertCard key={alert.id ?? `${alert.event}-${i}`} alert={alert} index={i} />
      ))}
    </motion.section>
  );
}
