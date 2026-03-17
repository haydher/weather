import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const THRESHOLD = 80;

/**
 * PullDownIndicator
 *
 * Drop this once anywhere near the top of your render tree (e.g. in App.jsx,
 * above the <motion.div> that wraps everything). It listens for the custom
 * events emitted by usePullDownToRefresh and shows a glassmorphic pull
 * indicator that matches the dark design system.
 *
 * Usage in App.jsx:
 *   import { PullDownIndicator } from "./components/ui/PullDownIndicator.jsx";
 *   ...
 *   return (
 *     <>
 *       <PullDownIndicator />
 *       <motion.div ...>
 *         ...
 *       </motion.div>
 *     </>
 *   );
 */
export function PullDownIndicator() {
  const [phase, setPhase] = useState("idle"); // idle | pulling | ready | releasing
  const [distance, setDistance] = useState(0);
  const releaseTimer = useRef(null);

  useEffect(() => {
    function onPull(e) {
      const d = e.detail.distance;
      setDistance(d);
      setPhase(d >= THRESHOLD ? "ready" : "pulling");
    }

    function onRelease() {
      setPhase("releasing");
      // Stay visible briefly so the user sees the spinner before reload
      releaseTimer.current = setTimeout(() => {
        setPhase("idle");
        setDistance(0);
      }, 1800);
    }

    function onCancel() {
      setPhase("idle");
      setDistance(0);
    }

    window.addEventListener("ptr:pull", onPull);
    window.addEventListener("ptr:release", onRelease);
    window.addEventListener("ptr:cancel", onCancel);

    return () => {
      window.removeEventListener("ptr:pull", onPull);
      window.removeEventListener("ptr:release", onRelease);
      window.removeEventListener("ptr:cancel", onCancel);
      clearTimeout(releaseTimer.current);
    };
  }, []);

  const visible = phase !== "idle";

  // How far the indicator has travelled (0→1 clamped)
  const progress = Math.min(distance / THRESHOLD, 1);
  // Translate the indicator down from -100% as the user pulls
  const translateY = phase === "releasing" ? 0 : `calc(-100% + ${distance}px)`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="ptr"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            // Safe-area aware so it clears the notch
            paddingTop: "max(12px, env(safe-area-inset-top))",
            paddingBottom: 12,
            pointerEvents: "none",
            transform: phase === "releasing" ? "translateY(0)" : `translateY(${translateY})`,
            transition: phase === "releasing" ? "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            }}
          >
            {phase === "releasing" ? <SpinnerIcon /> : <ArrowIcon progress={progress} ready={phase === "ready"} />}
            <span
              style={{
                fontSize: 13,
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                color: phase === "ready" ? "#7dd3fc" : "rgba(255,255,255,0.75)",
                transition: "color 0.2s ease",
                letterSpacing: "0.02em",
              }}
            >
              {phase === "releasing" ? "Refreshing…" : phase === "ready" ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Animated down-arrow that rotates 180° when threshold is crossed */
function ArrowIcon({ progress, ready }) {
  const rotation = ready ? 180 : progress * 160;
  const color = ready ? "#7dd3fc" : `rgba(255,255,255,${0.4 + progress * 0.55})`;

  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: ready ? "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), stroke 0.2s ease" : "stroke 0.2s ease",
        flexShrink: 0,
      }}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

/** CSS-only spinner matching the accent palette */
function SpinnerIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="9" />
      <motion.circle
        cx="12"
        cy="12"
        r="9"
        stroke="#7dd3fc"
        strokeDasharray="56"
        strokeDashoffset="42"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.75, ease: "linear", repeat: Infinity }}
        style={{ transformOrigin: "center" }}
      />
    </svg>
  );
}
