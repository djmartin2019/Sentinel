import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import Header from "@/components/layout/Header";
import { StatusPill } from "@/components/status/StatusPill";
import { getTargetsWithStatus } from "@/lib/data";
import {
  formatLatency,
  formatUptime,
  formatRelativeTime,
  getLatencyColor,
  cn,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const targets = await getTargetsWithStatus();
  const up = targets.filter((t) => t.status === "UP").length;
  const down = targets.filter((t) => t.status === "DOWN").length;
  const degraded = targets.filter((t) => t.status === "DEGRADED").length;

  return (
    <>
      <Header
        title="Targets"
        subtitle={`${targets.length} monitored endpoints`}
      />
      <div className="p-5 max-w-[1600px] space-y-4">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-status-up">
            <span className="w-2 h-2 rounded-full bg-status-up" />
            <span>{up} up</span>
          </div>
          <div className="flex items-center gap-1.5 text-status-degraded">
            <span className="w-2 h-2 rounded-full bg-status-degraded" />
            <span>{degraded} degraded</span>
          </div>
          <div className="flex items-center gap-1.5 text-status-down">
            <span className="w-2 h-2 rounded-full bg-status-down" />
            <span>{down} down</span>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 rounded hover:bg-accent-cyan/15 transition-colors"
            >
              <Plus className="w-3 h-3" strokeWidth={2.5} />
              Add target
            </button>
          </div>
        </div>

        <div className="rounded border border-border bg-bg-card overflow-hidden">
          {targets.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs font-mono text-text-muted">
              No targets in database
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "Name",
                      "Status",
                      "URL",
                      "Latency",
                      "Uptime",
                      "Interval",
                      "Last Check",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-text-muted whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {targets.map((target, i) => (
                    <tr
                      key={target.id}
                      className={cn(
                        "group border-b border-border/50 hover:bg-bg-elevated transition-colors",
                        i === targets.length - 1 && "border-b-0",
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-text-primary">
                          {target.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={target.status} pulse size="sm" />
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="font-mono text-[11px] text-text-muted truncate block">
                          {target.url}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span
                          className={
                            target.status === "DOWN"
                              ? "text-text-muted"
                              : getLatencyColor(target.latencyMs)
                          }
                        >
                          {target.status === "DOWN"
                            ? "—"
                            : formatLatency(target.latencyMs)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 rounded-full bg-bg-elevated overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                target.uptime > 99
                                  ? "bg-status-up"
                                  : target.uptime > 95
                                    ? "bg-status-degraded"
                                    : "bg-status-down",
                              )}
                              style={{ width: `${target.uptime}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-text-secondary">
                            {formatUptime(target.uptime)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">
                        {target.interval}s
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted whitespace-nowrap">
                        {formatRelativeTime(target.lastChecked)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/target/${target.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-accent-cyan"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
