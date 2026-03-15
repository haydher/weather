import { windDirectionToDegrees } from "../../lib/weatherUtils.js";

export function WindArrow({ direction, size = 20 }) {
  const deg = windDirectionToDegrees(direction);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform: `rotate(${deg}deg)` }}
    >
      <path d="M12 2v20M12 2l4 4M12 2L8 6" />
    </svg>
  );
}
