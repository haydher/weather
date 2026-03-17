import { useEffect, useRef, useCallback } from "react";

const THRESHOLD = 80; // px of pull needed to trigger
const MAX_PULL = 120; // px cap on rubber-band travel
const RESISTANCE = 0.45; // how much drag slows the pull

/**
 * usePullDownToRefresh
 *
 * Fires `onRefresh` when the user pulls down from the top of the page
 * while already scrolled to y=0.  Works in Safari PWA standalone mode
 * where the native pull-to-refresh gesture is disabled.
 *
 * Emits custom DOM events so PullToRefreshIndicator can react:
 *   - ptr:pull   → { detail: { distance: number } }
 *   - ptr:release → (triggered, will reload)
 *   - ptr:cancel  → (not far enough, snapping back)
 *
 * Usage:
 *   usePullDownToRefresh(async () => { window.location.reload(); });
 */
export function usePullDownToRefresh(onRefresh) {
  const startY = useRef(0);
  const currentY = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);

  const emit = useCallback((name, detail = {}) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }, []);

  useEffect(() => {
    const el = document.documentElement;

    function onTouchStart(e) {
      if (refreshing.current) return;
      // Only start if at the very top of the page
      if (window.scrollY > 0) return;
      if (e.touches.length !== 1) return;
      startY.current = e.touches[0].clientY;
      pulling.current = false;
    }

    function onTouchMove(e) {
      if (refreshing.current) return;
      if (window.scrollY > 0) return;

      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (pulling.current) {
          pulling.current = false;
          emit("ptr:cancel");
        }
        return;
      }

      // Prevent the page from scrolling upward while pulling
      e.preventDefault();

      pulling.current = true;
      currentY.current = dy;

      // Apply resistance so it feels rubber-bandy
      const distance = Math.min(dy * RESISTANCE, MAX_PULL);
      emit("ptr:pull", { distance, threshold: THRESHOLD });
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;

      const distance = Math.min(currentY.current * RESISTANCE, MAX_PULL);

      if (distance >= THRESHOLD) {
        refreshing.current = true;
        emit("ptr:release");
        Promise.resolve(onRefresh()).finally(() => {
          refreshing.current = false;
        });
      } else {
        emit("ptr:cancel");
      }

      currentY.current = 0;
    }

    // passive:false is required so we can call preventDefault in touchmove
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh, emit]);
}
