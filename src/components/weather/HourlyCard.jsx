import { motion } from 'framer-motion';
import { fToC } from '../../lib/formatters.js';
import { WeatherIcon } from '../ui/WeatherIcon.jsx';

const sizeStyles = {
  sm: {
    card: { flex: '0 0 60px', minWidth: 60, height: 56, padding: '6px 4px' },
    time: { fontSize: 10 },
    temp: { fontSize: 13 },
    showPrecip: false,
    iconSize: 20,
  },
  md: {
    card: { flex: '0 0 72px', minWidth: 72, height: 120, padding: '10px 8px' },
    time: { fontSize: 11 },
    temp: { fontSize: 18 },
    showPrecip: true,
    iconSize: 32,
  },
};

export function HourlyCard({ period, unitPrimary, formatTime, isNow, size = 'md', index = 0 }) {
  const style = sizeStyles[size] ?? sizeStyles.md;
  const tempDisplay = unitPrimary === 'F' ? period.temperature : fToC(period.temperature);
  const precip = period.probabilityOfPrecipitation?.value ?? 0;

  return (
    <motion.div
      key={period.startTime}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.05, duration: 0.35 }}
      className="glass-card"
      style={{
        ...style.card,
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border-glass)',
        boxShadow: isNow ? '0 0 0 1.5px rgba(100,180,255,0.8)' : undefined,
      }}
    >
      <div style={{ ...style.time, color: 'var(--text-secondary)', marginBottom: size === 'sm' ? 2 : 4 }}>
        {isNow ? 'Now' : formatTime(period.startTime)}
      </div>
      <WeatherIcon shortForecast={period.shortForecast} isDaytime={period.isDaytime} size={style.iconSize} />
      <div style={{ fontFamily: 'var(--font-display)', ...style.temp, fontWeight: 300 }}>
        {tempDisplay}°{unitPrimary}
      </div>
      {size === 'md' && (
        <>
          <div style={{ fontSize: 11, opacity: 0.45 }}>{fToC(period.temperature)}°C</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{precip}%</div>
        </>
      )}
    </motion.div>
  );
}
