import { useEffect, useRef, useCallback } from "react";

const THRESHOLD = 80; // px of pull needed to trigger
const MAX_PULL = 120; // px cap on rubber-band travel
const RESISTANCE = 0.45; // how much drag slows the pull
const CANCEL_SLOP = 6; // px upward wiggle before we treat as cancel
const EMIT_EPSILON = 0.5; // ignore tiny distance deltas to reduce jitter

/**
 * usePullDownToRefresh
 *
 * Fires `onRefresh` when the user pulls down from the top of the page
 * while already scrolled to y=0.  Works in Safari PWA standalone mode
 * where the native pull-to-refresh gesture is disabled.
 * Also supports click-and-drag with a mouse.
 *
 * Emits custom DOM events so PullToRefreshIndicator can react:
 *   - ptr:pull   → { detail: { distance: number } }
 *   - ptr:release → (refresh started, show spinner)
 *   - ptr:cancel  → (not far enough, snapping back)
 *   - ptr:complete → (refresh promise settled, hide spinner)
 *
 * Usage:
 *   usePullDownToRefresh(async () => { await refreshWeatherData(); });
 */
export function usePullDownToRefresh(onRefresh) {
  const startY = useRef(0);
  const currentY = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  const frame = useRef(0);
  const pendingDistance = useRef(0);
  const lastEmittedDistance = useRef(-1);

  const emit = useCallback((name, detail = {}) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    function flushPull() {
      frame.current = 0;
      const distance = pendingDistance.current;
      if (Math.abs(distance - lastEmittedDistance.current) < EMIT_EPSILON) return;
      lastEmittedDistance.current = distance;
      emit("ptr:pull", { distance, threshold: THRESHOLD });
    }

    function schedulePull(distance) {
      pendingDistance.current = distance;
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(flushPull);
    }

    // ─── Touch ────────────────────────────────────────────────────────────────

    function onTouchStart(e) {
      if (refreshing.current) return;
      if (window.scrollY > 0) return;
      if (e.touches.length !== 1) return;
      startY.current = e.touches[0].clientY;
      pulling.current = false;
    }

    function onTouchMove(e) {
      if (refreshing.current) return;
      if (window.scrollY > 0) return;

      const rawDy = e.touches[0].clientY - startY.current;
      if (rawDy < -CANCEL_SLOP) {
        if (pulling.current) {
          pulling.current = false;
          emit("ptr:cancel");
        }
        return;
      }
      const dy = Math.max(0, rawDy);
      if (dy === 0) return;

      e.preventDefault();
      pulling.current = true;
      currentY.current = dy;

      const distance = Math.min(dy * RESISTANCE, MAX_PULL);
      schedulePull(distance);
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
          emit("ptr:complete");
        });
      } else {
        emit("ptr:cancel");
      }

      currentY.current = 0;
    }

    // ─── Mouse ────────────────────────────────────────────────────────────────

    function onMouseDown(e) {
      if (refreshing.current) return;
      if (window.scrollY > 0) return;
      if (e.button !== 0) return; // left button only
      startY.current = e.clientY;
      pulling.current = false;

      // Attach move/up to window so drags outside the element still register
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e) {
      if (refreshing.current) return;

      const rawDy = e.clientY - startY.current;
      if (rawDy < -CANCEL_SLOP) {
        if (pulling.current) {
          pulling.current = false;
          emit("ptr:cancel");
        }
        return;
      }
      const dy = Math.max(0, rawDy);
      if (dy === 0) return;

      pulling.current = true;
      currentY.current = dy;

      const distance = Math.min(dy * RESISTANCE, MAX_PULL);
      schedulePull(distance);
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      if (!pulling.current) return;
      pulling.current = false;

      const distance = Math.min(currentY.current * RESISTANCE, MAX_PULL);
      if (distance >= THRESHOLD) {
        refreshing.current = true;
        emit("ptr:release");
        Promise.resolve(onRefresh()).finally(() => {
          refreshing.current = false;
          emit("ptr:complete");
        });
      } else {
        emit("ptr:cancel");
      }

      currentY.current = 0;
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    el.addEventListener("mousedown", onMouseDown);

    return () => {
      if (frame.current) {
        window.cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
      // Clean up in case the component unmounts mid-drag
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onRefresh, emit]);
}
