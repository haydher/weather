import { motion } from 'framer-motion';
import { formatTime } from '../../lib/formatters.js';
import { HourlyCard } from './HourlyCard.jsx';

export function HourlyStrip({ hourlyPeriods, unitPrimary }) {
  const now = new Date();
  const periods = hourlyPeriods.slice(0, 24);

  return (
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25, duration: 0.35 }}
    >
      <h2 className="weather-label" style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 18 }}>
        Hourly
      </h2>
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingBottom: 8,
        }}
      >
        {periods.map((p, i) => {
          const start = new Date(p.startTime);
          const end = new Date(p.endTime);
          const isNow = now >= start && now < end && start.toDateString() === now.toDateString();
          return (
            <HourlyCard
              key={p.startTime}
              period={p}
              unitPrimary={unitPrimary}
              formatTime={formatTime}
              isNow={isNow}
              size="md"
              index={i}
            />
          );
        })}
      </div>
    </motion.section>
  );
}
