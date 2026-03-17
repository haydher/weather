import { motion, AnimatePresence } from "framer-motion";

export function ErrorBanner({ message, onRetry }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(239, 68, 68, 0.4)",
            background: "rgba(239, 68, 68, 0.1)",
            color: "var(--text-primary)",
          }}
        >
          <p style={{ margin: "0 0 12px" }}>{message}</p>
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid var(--border-glass)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
