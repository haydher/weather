import { motion, AnimatePresence } from "framer-motion";

export function LiveMapSection({ selectedPlace, unitPrimary }) {
  if (!selectedPlace) return null;

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
      <h2 className="weather-label" style={{ margin: "0 0 12px", fontFamily: "var(--font-display)", fontSize: 18 }}>
        Live Map
      </h2>
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ overflow: "hidden", marginTop: 8 }}
        >
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-glass)" }}>
            <iframe
              title="Windy Live Map"
              src={`https://embed.windy.com/embed.html?lat=${selectedPlace.lat}&lon=${selectedPlace.lon}&metricTemp=°${unitPrimary}&zoom=0&level=surface&overlay=temp&menu=&message=&calendar=now`}
              width="100%"
              height="280"
              frameBorder="0"
              style={{ display: "block" }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
