import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

export function UnitToggle({ unitPrimary, onChange }) {
  const isF = unitPrimary === "F";
  const dragState = useRef({ dragging: false, startX: 0, moved: false });

  const handlePointerDown = useCallback((e) => {
    dragState.current = { dragging: true, startX: e.clientX, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 6) dragState.current.moved = true;
  }, []);

  const handlePointerUp = useCallback(
    (e) => {
      if (!dragState.current.dragging) return;
      const dx = e.clientX - dragState.current.startX;
      const wasDrag = dragState.current.moved;
      dragState.current.dragging = false;
      dragState.current.moved = false;

      if (!wasDrag) {
        // Tap — just toggle
        onChange(unitPrimary === "F" ? "C" : "F");
      } else {
        // Drag — pick side based on direction
        if (dx > 0) onChange("C");
        else onChange("F");
      }
    },
    [unitPrimary, onChange]
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 20,
        padding: 4,
        position: "relative",
        cursor: "grab",
        userSelect: "none",
        touchAction: "none",
      }}
    >
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
          pointerEvents: "none",
        }}
      />

      {["F", "C"].map((unit) => (
        <div
          key={unit}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "5px 14px",
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 500,
            color: unitPrimary === unit ? "#fff" : "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-body)",
            transition: "color 200ms ease",
            pointerEvents: "none",
          }}
        >
          °{unit}
        </div>
      ))}
    </div>
  );
}
