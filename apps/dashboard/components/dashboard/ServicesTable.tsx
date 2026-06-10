import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { StatusPill } from '@/components/status/StatusPill';
import { formatLatency, formatUptime, formatRelativeTime, getLatencyColor, cn } from '@/lib/utils';
import type { MonitoredTarget } from '@/lib/types';

interface ServicesTableProps {
  targets: MonitoredTarget[];
}

export default function ServicesTable({ targets }: ServicesTableProps) {
  return (
    <div className="rounded border border-border bg-bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Services</h2>
          <p className="text-[11px] text-text-muted mt-0.5">{targets.length} monitored endpoints</p>
        </div>
        <Link
          href="/targets"
          className="flex items-center gap-1 text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
        >
          View all <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {targets.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs font-mono text-text-muted">
          No targets configured. Add rows to MonitoredTarget in the database.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Service', 'Status', 'Latency', 'Uptime', 'Last Check'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-widest text-text-muted whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right text-[10px] font-medium uppercase tracking-widest text-text-muted whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target, i) => (
                <tr
                  key={target.id}
                  className={cn(
                    'border-b border-border/50 hover:bg-bg-elevated transition-colors duration-100',
                    i === targets.length - 1 && 'border-b-0'
                  )}
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-mono text-xs font-medium text-text-primary">{target.name}</div>
                      <div className="text-[11px] text-text-muted truncate max-w-[200px] mt-0.5">{target.url}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={target.status} pulse size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('font-mono text-xs', target.status === 'DOWN' ? 'text-text-muted' : getLatencyColor(target.latencyMs))}>
                      {target.status === 'DOWN' ? '—' : formatLatency(target.latencyMs)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full bg-bg-elevated overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', target.uptime > 99 ? 'bg-status-up' : target.uptime > 95 ? 'bg-status-degraded' : 'bg-status-down')}
                          style={{ width: `${target.uptime}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-text-secondary">{formatUptime(target.uptime)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted whitespace-nowrap">
                    {formatRelativeTime(target.lastChecked)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/target/${target.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 rounded hover:bg-accent-cyan/15 transition-colors whitespace-nowrap"
                    >
                      View target
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                    </Link>
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
