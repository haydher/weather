import { motion, AnimatePresence } from "framer-motion";

export function SearchDropdown({ results, formatPlaceDisplay, onSelectPlace }) {
  return (
    <AnimatePresence>
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 6,
            borderRadius: 16,
            background: "rgba(10, 15, 30, 0.95)",
            border: "1px solid var(--border-glass)",
            backdropFilter: "var(--blur)",
            zIndex: 10,
            overflow: "hidden", // <- important, clips the scrollbar
          }}
        >
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              maxHeight: 220,
              overflowY: "auto", // scroll happens here
            }}
          >
            {results.map((r) => (
              <li
                key={r.place_id || r.lat + r.lon}
                onClick={() => onSelectPlace(r)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  borderBottom: "1px solid var(--border-glass)",
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                }}
              >
                {formatPlaceDisplay(r) || r.display_name}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
