import React, { useId } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip } from 'recharts';

export interface SparklinePoint {
  label: string;
  value: number;
}

interface SparklineChartProps {
  data: SparklinePoint[];
  color?: string;
  height?: number;
  formatValue?: (val: number) => string;
  ariaLabel?: string;
}

/**
 * Miniature Recharts Area Sparkline for visualizing seasonal trends inside Dashboard KPI cards.
 */
export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color = '#818cf8',
  height = 44,
  formatValue = (v) => v.toLocaleString('fr-FR'),
  ariaLabel = 'Tendance saisonnière',
}) => {
  const rawId = useId();
  const gradientId = `spark-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  if (!data || data.length === 0) {
    return <div style={{ height }} className="w-full" aria-hidden="true" />;
  }

  return (
    <div
      style={{ height, minWidth: 0 }}
      className="w-full select-none"
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.36} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <RechartsTooltip
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '2 2' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const point = payload[0].payload as SparklinePoint;
              return (
                <div className="px-2 py-1 rounded-lg bg-zinc-900/95 dark:bg-[#1D1C33]/95 border border-zinc-700/80 dark:border-white/15 text-[11px] font-mono text-white shadow-md whitespace-nowrap">
                  <span className="text-zinc-300 font-sans mr-1.5">{point.label} :</span>
                  <span className="font-bold tabular-nums">{formatValue(point.value)}</span>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3.5, fill: color, stroke: '#ffffff', strokeWidth: 1.5 }}
            animationDuration={350}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
