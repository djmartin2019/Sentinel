import Link from 'next/link';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { StatusPill } from '@/components/status/StatusPill';
import { formatLatency, formatUptime, formatRelativeTime, getLatencyColor, cn } from '@/lib/utils';
import type { MonitoredTarget } from '@/lib/types';

interface ServicesTableProps {
  targets: MonitoredTarget[];
}

export default function ServicesTable({ targets }: ServicesTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Services</h2>
          <p className="mt-0.5 text-xs text-text-muted">{targets.length} monitored endpoints</p>
        </div>
        <Link
          href="/targets"
          className="flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-accent-cyan"
        >
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {targets.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-text-muted">
          No targets configured. Add rows to MonitoredTarget in the database.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Service', 'Status', 'Latency', 'Uptime · 30d', 'Last check'].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-medium text-text-muted"
                  >
                    {h}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {targets.map((target) => (
                <tr
                  key={target.id}
                  className="group relative border-b border-border-subtle transition-colors last:border-b-0 hover:bg-white/[0.025]"
                >
                  <td className="px-4 py-3">
                    {/* Stretched link makes the whole row clickable */}
                    <Link
                      href={`/target/${target.id}`}
                      className="font-medium text-text-primary underline-offset-4 decoration-accent-cyan/60 after:absolute after:inset-0 group-hover:text-accent-cyan group-hover:underline"
                    >
                      {target.name}
                    </Link>
                    <div className="mt-0.5 max-w-[240px] truncate font-mono text-[11px] text-text-muted">
                      {target.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={target.status} pulse size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'font-mono text-xs tabular-nums',
                        target.status === 'DOWN' ? 'text-text-muted' : getLatencyColor(target.latencyMs),
                      )}
                    >
                      {target.status === 'DOWN' ? '—' : formatLatency(target.latencyMs)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-14 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            target.uptime > 99 ? 'bg-accent-cyan' : target.uptime > 95 ? 'bg-status-degraded' : 'bg-status-down',
                          )}
                          style={{ width: `${target.uptime}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs tabular-nums text-text-secondary">
                        {formatUptime(target.uptime)}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted">
                    {formatRelativeTime(target.lastChecked)}
                  </td>
                  <td className="pr-4 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-text-dim transition-colors group-hover:text-accent-cyan" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
