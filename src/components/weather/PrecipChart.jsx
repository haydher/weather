import { useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Chart, CategoryScale, LinearScale, BarElement, BarController, Tooltip, registerables } from 'chart.js';
import { formatTime } from '../../lib/formatters.js';

Chart.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip, ...registerables);

export function PrecipChart({ hourlyPeriods, header }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const precipData = useMemo(
    () => hourlyPeriods.map((p) => p.probabilityOfPrecipitation?.value ?? 0),
    [hourlyPeriods],
  );
  const hourlyLabels = useMemo(
    () => hourlyPeriods.map((p) => formatTime(p.startTime)),
    [hourlyPeriods],
  );

  useEffect(() => {
    if (!hourlyLabels.length || !precipData.length || !chartRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
    const ctx = chartRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hourlyLabels,
        datasets: [
          {
            data: precipData,
            backgroundColor: (ctx) => {
              const value = ctx.raw;
              return `rgba(100, 180, 255, ${0.2 + (value / 100) * 0.7})`;
            },
            borderColor: 'rgba(120, 200, 255, 0.6)',
            borderWidth: 0,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        animation: {
          delay: (ctx) => ctx.dataIndex * 20,
          duration: 600,
          easing: 'easeOutQuart',
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: 'rgba(255,255,255,0.35)',
              font: { size: 10, family: 'Nunito Sans' },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8,
            },
            border: { display: false },
          },
          y: {
            display: false,
            min: 0,
            max: 100,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw}% chance`,
            },
            backgroundColor: 'rgba(10, 20, 40, 0.85)',
            titleColor: 'rgba(255,255,255,0.7)',
            bodyColor: '#fff',
            padding: 8,
            cornerRadius: 8,
          },
        },
        responsive: true,
        maintainAspectRatio: false,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    });
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [hourlyLabels, precipData]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card"
      style={{ padding: 16 }}
    >
      <p className="weather-label" style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>
        {header}
      </p>
      <div style={{ height: 100 }}>
        <canvas ref={chartRef} />
      </div>
    </motion.section>
  );
}
