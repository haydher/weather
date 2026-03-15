export function fToC(f) {
  if (f == null) return null;
  return Math.round(((Number(f) - 32) * 5) / 9);
}

export function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).replace(":00", "");
}

export function formatDay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  return d.toLocaleDateString([], { weekday: "short" });
}
