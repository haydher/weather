import { useState } from "react";
import { motion } from "framer-motion";

export function UnitToggle({ unitPrimary, onChange }) {
  const isF = unitPrimary === "F";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 20,
        padding: 4,
        gap: 0,
        position: "relative",
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={() => onChange(isF ? "C" : "F")}
    >
      {/* sliding pill */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          width: "calc(50% - 4px)",
          background: "rgba(255,255,255,0.18)",
          borderRadius: 16,
          left: isF ? 4 : "calc(50%)",
        }}
      />

      {["F", "C"].map((unit) => (
        <motion.button
          key={unit}
          type="button"
          whileTap={{ scaleX: 0.88, scaleY: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          onClick={(e) => {
            e.stopPropagation();
            onChange(unit);
          }}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "5px 14px",
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 500,
            border: "none",
            background: "transparent",
            color: unitPrimary === unit ? "#fff" : "rgba(255,255,255,0.4)",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            minHeight: "unset",
            minWidth: "unset",
            transition: "color 200ms ease",
          }}
        >
          °{unit}
        </motion.button>
      ))}
    </div>
  );
}
