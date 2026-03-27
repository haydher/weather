import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const THRESHOLD = 80;
const MAX_PULL = 120;
const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// The translated wrapper includes extra vertical padding (12 top + 12 bottom).
// The pill starts becoming visible only after that padding has entered view.
// Fill should start at first pill visibility and reach 100% at MAX_PULL.
const WRAPPER_VERTICAL_PADDING = 24;
const RING_START = WRAPPER_VERTICAL_PADDING; // first pixel of pill visible
const RING_RANGE = MAX_PULL - RING_START; // distance over which ring fills

export function PullDownIndicator() {
  const [phase, setPhase] = useState("idle"); // idle | pulling | ready | releasing
  const [distance, setDistance] = useState(0);
  const releaseTimer = useRef(null);

  useEffect(() => {
    function resetToIdle() {
      setPhase("idle");
      setDistance(0);
      clearTimeout(releaseTimer.current);
    }

    function onPull(e) {
      clearTimeout(releaseTimer.current);
      const d = e.detail.distance;
      setDistance(d);
      setPhase(d >= THRESHOLD ? "ready" : "pulling");
    }

    function onRelease() {
      setPhase("releasing");
      clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => {
        resetToIdle();
      }, 8000);
    }

    function onCancel() {
      resetToIdle();
    }

    function onComplete() {
      resetToIdle();
    }

    window.addEventListener("ptr:pull", onPull);
    window.addEventListener("ptr:release", onRelease);
    window.addEventListener("ptr:cancel", onCancel);
    window.addEventListener("ptr:complete", onComplete);

    return () => {
      window.removeEventListener("ptr:pull", onPull);
      window.removeEventListener("ptr:release", onRelease);
      window.removeEventListener("ptr:cancel", onCancel);
      window.removeEventListener("ptr:complete", onComplete);
      clearTimeout(releaseTimer.current);
    };
  }, []);

  const visible = phase !== "idle";

  // Progress starts when the pill first appears, then climbs 0→1 up to MAX_PULL
  const progress = Math.max(0, Math.min((distance - RING_START) / RING_RANGE, 1));

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
              justifyContent: "center",
              padding: 5,
              borderRadius: 100,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            }}
          >
            {phase === "releasing" ? <SpinnerRing /> : <ProgressRing progress={progress} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Ring that fills from first visibility to 100% at MAX_PULL */
function ProgressRing({ progress }) {
  const offset = CIRCUMFERENCE * (1 - progress);
  const opacity = 0.3 + progress * 0.7;

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {/* Track */}
      <circle cx="12" cy="12" r={RADIUS} stroke="rgba(255,255,255,0.15)" strokeWidth="2.2" />
      {/* Fill arc */}
      <circle
        cx="12"
        cy="12"
        r={RADIUS}
        stroke={`rgba(125,211,252,${opacity})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 12 12)"
        style={{ transition: "stroke 0.2s ease" }}
      />
    </svg>
  );
}

/** Spinning arc shown after release */
function SpinnerRing() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {/* Track */}
      <circle cx="12" cy="12" r={RADIUS} stroke="rgba(255,255,255,0.15)" strokeWidth="2.2" />
      {/* Spinning arc */}
      <motion.circle
        cx="12"
        cy="12"
        r={RADIUS}
        stroke="#7dd3fc"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * 0.75}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.75, ease: "linear", repeat: Infinity }}
        style={{ transformOrigin: "center" }}
      />
    </svg>
  );
}
