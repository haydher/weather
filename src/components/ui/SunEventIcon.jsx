import { SUN_EVENT_ICONS_BASE } from "../../lib/constants.js";

export function SunEventIcon({ variant, size = 32, alt }) {
  const name = variant === "sunrise" ? "sunrise" : "sunset";
  const src = `${SUN_EVENT_ICONS_BASE}/${name}.svg`;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt || (variant === "sunrise" ? "Sunrise" : "Sunset")}
      style={{ objectFit: "contain", display: "block", flexShrink: 0 }}
    />
  );
}
