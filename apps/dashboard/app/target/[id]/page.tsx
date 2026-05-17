import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Header from '@/components/layout/Header';
import { StatusPill } from '@/components/status/StatusPill';
import LatencyChart from '@/components/charts/LatencyChart';
import UptimeChart from '@/components/charts/UptimeChart';
import {
  getTargetById,
  getLatencyTimeSeries,
  getUptimeTimeSeries,
} from '@/lib/queries';
import { formatLatency, formatUptime, formatRelativeTime, getLatencyColor, cn } from '@/lib/utils';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TargetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [target, latencyData, uptimeData] = await Promise.all([
    getTargetById(id),
    getLatencyTimeSeries(id),
    getUptimeTimeSeries(id),
  ]);

  if (!target) notFound();

  const statItems = [
    { label: 'Current Status', value: <StatusPill status={target.status} pulse /> },
    {
      label: 'Latency',
      value: (
        <span
          className={cn(
            'font-mono text-sm font-semibold',
            target.status === 'DOWN' ? 'text-text-muted' : getLatencyColor(target.latencyMs)
          )}
        >
          {target.status === 'DOWN' ? '—' : formatLatency(target.latencyMs)}
        </span>
      ),
    },
    {
      label: 'Uptime (30d)',
      value: <span className="font-mono text-sm font-semibold text-status-up">{formatUptime(target.uptime)}</span>,
    },
    {
      label: 'Check Interval',
      value: <span className="font-mono text-sm text-text-secondary">{target.interval}s</span>,
    },
    {
      label: 'Last Check',
      value: (
        <span className="font-mono text-sm text-text-secondary">
          {formatRelativeTime(target.lastChecked)}
        </span>
      ),
    },
  ];

  return (
    <>
      <Header title={target.name} subtitle={target.url} />
      <div className="p-5 max-w-[1600px] space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/targets" className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            All targets
          </Link>
          <div className="h-3 w-px bg-border" />
          <a
            href={target.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open endpoint
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statItems.map(({ label, value }) => (
            <div key={label} className="p-3 rounded border border-border bg-bg-card">
              <p className="text-[10px] uppercase tracking-widest font-medium text-text-muted mb-2">{label}</p>
              <div>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <LatencyChart data={latencyData} subtitle={target.name} />
          <UptimeChart data={uptimeData} subtitle={target.name} />
        </div>

        <div className="rounded border border-border bg-bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Recent Checks</h2>
          </div>
          {target.checks.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs font-mono text-text-muted">No checks recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Time', 'Status', 'HTTP Code', 'Latency', 'Error'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-widest text-text-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {target.checks.map((check) => {
                    const displayStatus =
                      check.status === 'UP' &&
                      (check.latencyMs ?? 0) > 800
                        ? 'DEGRADED'
                        : check.status;
                    return (
                      <tr key={check.id} className="border-b border-border/50 last:border-b-0 hover:bg-bg-elevated transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-text-muted">
                          {new Date(check.checkedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false,
                          })}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusPill status={displayStatus} size="sm" />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                          {check.statusCode ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          <span
                            className={
                              check.status === 'DOWN'
                                ? 'text-text-muted'
                                : getLatencyColor(check.latencyMs ?? 0)
                            }
                          >
                            {check.status === 'DOWN' ? '—' : `${check.latencyMs ?? 0}ms`}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-status-down">
                          {check.errorMessage ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
