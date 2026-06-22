"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { UptimeDataPoint } from "@/lib/types";
import { useRouter } from "next/navigation";

interface UptimeChartProps {
  data: UptimeDataPoint[];
  subtitle?: string;
  targets?: { id: string; name: string }[];
  selectedTargetId?: string;
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
        className={`font-medium ${value >= 99.5 ? "text-status-up" : value >= 95 ? "text-status-degraded" : "text-status-down"}`}
      >
        {value.toFixed(3)}%
      </p>
    </div>
  );
};

export default function UptimeChart({
  data,
  subtitle = "all targets · composite",
  targets,
  selectedTargetId,
}: UptimeChartProps) {
  const router = useRouter();
  const visibleData = data.filter((_, i) => i % 2 === 0);
  const latestUptime = data.length > 0 ? data[data.length - 1]!.uptime : null;

  function onTargetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    router.push(id ? `/?target=${id}` : "/");
  }

  const headerLabel = targets ? (
    <select
      value={selectedTargetId ?? ""}
      onChange={onTargetChange}
      className="mt-0.5 text-[11px] font-mono text-text-secondary bg-bg-elevated border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent-cyan/50"
    >
      <option value="">All Targets</option>
      {targets.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  ) : (
    <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>
  );

  if (data.length === 0) {
    return (
      <div className="rounded border border-border bg-bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Uptime — Last 30d
            </h2>
            {headerLabel}
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
          <h2 className="text-sm font-semibold text-text-primary">
            Uptime — Last 30d
          </h2>
          {headerLabel}
        </div>
        {latestUptime != null && (
          <span className="font-mono text-sm font-semibold text-status-up">
            {latestUptime.toFixed(2)}%
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={visibleData}
          margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
        >
          <defs>
            <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(30,45,64,0.8)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            interval={Math.max(0, Math.floor(visibleData.length / 4) - 1)}
          />
          <YAxis
            domain={[90, 100]}
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace" }}
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
            activeDot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
