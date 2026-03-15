import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fToC } from "../../lib/formatters.js";

export function TemperatureDisplay({ value, unitPrimary }) {
  const num = value != null ? Number(value) : 0;
  const displayVal = unitPrimary === "F" ? num : fToC(num);
  const secondary = unitPrimary === "F" ? fToC(num) : num;
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    const target = Math.round(displayVal);
    const duration = 300;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - (1 - t) * (1 - t);
      setCount(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [displayVal]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <span style={{ fontSize: 72, fontWeight: 200, lineHeight: 1, fontFamily: "var(--font-display)" }}>{count}°</span>
      <span style={{ fontSize: 20, opacity: 0.45, fontWeight: 300 }}>{unitPrimary}</span>
      <p style={{ margin: "2px 0 0", fontSize: 18, opacity: 0.5 }}>
        {secondary}°{unitPrimary === "F" ? "C" : "F"}
      </p>
    </motion.div>
  );
}
