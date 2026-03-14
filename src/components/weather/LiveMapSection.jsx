import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function LiveMapSection({ selectedPlace }) {
  const [open, setOpen] = useState(false);

  if (!selectedPlace) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="glass-card"
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          border: '1px solid var(--border-glass)',
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          cursor: 'pointer',
          borderRadius: 12,
        }}
      >
        🛰 Live Map
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden', marginTop: 8 }}
          >
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
              <iframe
                title="Windy Live Map"
                src={`https://embed.windy.com/embed.html?lat=${selectedPlace.lat}&lon=${selectedPlace.lon}&zoom=7&level=surface&overlay=clouds`}
                width="100%"
                height="280"
                frameBorder="0"
                style={{ display: 'block' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
