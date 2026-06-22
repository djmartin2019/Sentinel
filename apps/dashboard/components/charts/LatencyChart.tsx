"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { LatencyDataPoint, LatencyRange } from "@/lib/types";
import {
  LATENCY_RANGE_LABELS,
  LATENCY_RANGES,
} from "@/lib/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface LatencyChartProps {
  data: LatencyDataPoint[];
  subtitle?: string;
  targets?: { id: string; name: string }[];
  selectedTargetId?: string;
  selectedRange?: LatencyRange;
}

type TooltipPayload = { name: string; value: number; color: string };

const SELECT_CLASS =
  "mt-0.5 text-[11px] font-mono text-text-secondary bg-bg-elevated border border-border rounded px-2 py-0.5 focus:outline-none focus:border-accent-cyan/50";

function downsampleChartData(data: LatencyDataPoint[]): LatencyDataPoint[] {
  if (data.length <= 120) return data;
  return data.filter((_, i) => i % 2 === 0);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-elevated border border-border rounded px-3 py-2 text-xs font-mono shadow-lg">
      <p className="text-text-muted mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="w-2 h-0.5 rounded"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-text-secondary">{p.name}:</span>
          <span className="text-text-primary font-medium">{p.value}ms</span>
        </div>
      ))}
    </div>
  );
}

export default function LatencyChart({
  data,
  subtitle = "all targets",
  targets,
  selectedTargetId,
  selectedRange = "60m",
}: LatencyChartProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visibleData = downsampleChartData(data);
  const chartTitle = `Latency — ${LATENCY_RANGE_LABELS[selectedRange]}`;

  function pushFilterParams(updates: {
    target?: string | null;
    range?: LatencyRange | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.target !== undefined) {
      if (updates.target) params.set("target", updates.target);
      else params.delete("target");
    }

    if (updates.range !== undefined) {
      if (updates.range && updates.range !== "60m") {
        params.set("range", updates.range);
      } else {
        params.delete("range");
      }
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onTargetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    pushFilterParams({ target: e.target.value || null });
  }

  function onRangeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    pushFilterParams({ range: e.target.value as LatencyRange });
  }

  const rangeSelect = (
    <select
      value={selectedRange}
      onChange={onRangeChange}
      className={SELECT_CLASS}
    >
      {LATENCY_RANGES.map((range) => (
        <option key={range} value={range}>
          {LATENCY_RANGE_LABELS[range]}
        </option>
      ))}
    </select>
  );

  const headerControls = (
    <div className="flex flex-wrap items-center gap-2 mt-0.5">
      {targets ? (
        <select
          value={selectedTargetId ?? ""}
          onChange={onTargetChange}
          className={SELECT_CLASS}
        >
          <option value="">All Targets</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-[11px] text-text-muted">{subtitle}</p>
      )}
      {rangeSelect}
    </div>
  );

  if (data.length === 0) {
    return (
      <div className="rounded border border-border bg-bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              {chartTitle}
            </h2>
            {headerControls}
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
            {chartTitle}
          </h2>
          {headerControls}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-px bg-accent-cyan inline-block" />
            avg
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-px bg-accent-blue inline-block" />
            p95
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-px bg-accent-purple inline-block" />
            p99
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={visibleData}
          margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(30,45,64,0.8)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            interval={Math.max(0, Math.floor(visibleData.length / 8) - 1)}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}ms`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="latencyMs"
            name="avg"
            stroke="#22d3ee"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "#22d3ee", strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="p95Ms"
            name="p95"
            stroke="#60a5fa"
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
            activeDot={{ r: 3, fill: "#60a5fa", strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="p99Ms"
            name="p99"
            stroke="#a78bfa"
            strokeWidth={1}
            strokeDasharray="2 3"
            dot={false}
            activeDot={{ r: 3, fill: "#a78bfa", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
