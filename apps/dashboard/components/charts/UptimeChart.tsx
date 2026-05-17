'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { UptimeDataPoint } from '@/lib/types';

interface UptimeChartProps {
  data: UptimeDataPoint[];
  subtitle?: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]!.value;
  return (
    <div className="bg-bg-elevated border border-border rounded px-3 py-2 text-xs font-mono shadow-lg">
      <p className="text-text-muted mb-1">{label}</p>
      <p
        className={`font-medium ${value >= 99.5 ? 'text-status-up' : value >= 95 ? 'text-status-degraded' : 'text-status-down'}`}
      >
        {value.toFixed(3)}%
      </p>
    </div>
  );
};

export default function UptimeChart({
  data,
  subtitle = 'all targets · composite',
}: UptimeChartProps) {
  const visibleData = data.filter((_, i) => i % 2 === 0);
  const latestUptime =
    data.length > 0 ? data[data.length - 1]!.uptime : null;

  if (data.length === 0) {
    return (
      <div className="rounded border border-border bg-bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Uptime — Last 30d</h2>
            <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-[180px] text-xs font-mono text-text-muted">
          No check data yet
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Uptime — Last 30d</h2>
          <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>
        </div>
        {latestUptime != null && (
          <span className="font-mono text-sm font-semibold text-status-up">
            {latestUptime.toFixed(2)}%
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={visibleData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,64,0.8)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            interval={Math.max(0, Math.floor(visibleData.length / 4) - 1)}
          />
          <YAxis
            domain={[90, 100]}
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="uptime"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#uptimeGradient)"
            dot={false}
            activeDot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
