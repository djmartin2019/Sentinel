'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn, formatUptime } from '@/lib/utils';
import type { DailyUptimeBucket, MonitoredTarget, TargetStatus } from '@/lib/types';

interface UptimeBarsProps {
  targets: MonitoredTarget[];
  dailyUptimeByTarget: Record<string, DailyUptimeBucket[]>;
}

const statusDot: Record<TargetStatus, string> = {
  UP: 'bg-status-up',
  DEGRADED: 'bg-status-degraded',
  DOWN: 'bg-status-down',
};

function barClass(uptime: number | null): string {
  if (uptime === null) return 'bg-white/[0.06]';
  if (uptime >= 99.9) return 'bg-status-up/80 group-hover/bar:bg-status-up';
  if (uptime >= 99) return 'bg-status-degraded/85 group-hover/bar:bg-status-degraded';
  return 'bg-status-down/85 group-hover/bar:bg-status-down';
}

/** Check-weighted uptime over the buckets; null if there's no data at all. */
function overallUptime(buckets: DailyUptimeBucket[]): number | null {
  let weighted = 0;
  let checks = 0;
  for (const b of buckets) {
    if (b.uptime === null) continue;
    weighted += b.uptime * b.checks;
    checks += b.checks;
  }
  return checks > 0 ? weighted / checks : null;
}

function formatDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

type Hover = { targetId: string; bucket: DailyUptimeBucket };

export default function UptimeBars({ targets, dailyUptimeByTarget }: UptimeBarsProps) {
  const [hover, setHover] = useState<Hover | null>(null);
  const days = dailyUptimeByTarget[targets[0]?.id ?? '']?.length ?? 90;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Uptime history</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Daily uptime per target · last {days} days (UTC)
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <Legend className="bg-status-up/80" label="≥ 99.9%" />
          <Legend className="bg-status-degraded/85" label="≥ 99%" />
          <Legend className="bg-status-down/85" label="< 99%" />
          <Legend className="bg-white/[0.06]" label="No data" />
        </div>
      </div>

      {targets.length === 0 ? (
        <p className="px-5 py-8 text-center text-xs text-text-muted">No targets configured.</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {targets.map((target) => {
            const buckets = dailyUptimeByTarget[target.id] ?? [];
            const overall = overallUptime(buckets);
            const hovered = hover?.targetId === target.id ? hover.bucket : null;

            return (
              <li
                key={target.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:grid-cols-[180px_minmax(0,1fr)_88px] sm:px-5"
              >
                <Link
                  href={`/target/${target.id}`}
                  className="flex min-w-0 items-center gap-2 text-sm text-text-primary transition-colors hover:text-accent-cyan"
                >
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDot[target.status])} />
                  <span className="truncate">{target.name}</span>
                </Link>

                <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                  <div
                    className="flex h-7 items-stretch gap-[2px]"
                    onMouseLeave={() => setHover(null)}
                  >
                    {buckets.map((b, i) => (
                      <div
                        key={b.day}
                        className={cn(
                          'group/bar flex flex-1 cursor-default items-stretch',
                          // On small screens only show the most recent 30 days
                          i < buckets.length - 30 && 'hidden md:flex',
                        )}
                        onMouseEnter={() => setHover({ targetId: target.id, bucket: b })}
                      >
                        <div
                          className={cn(
                            'w-full rounded-[2px] transition-colors',
                            barClass(b.uptime),
                            hovered?.day === b.day && 'ring-1 ring-white/60',
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-right font-mono text-xs tabular-nums">
                  {hovered ? (
                    <span className="text-text-secondary">
                      <span className="text-text-muted">{formatDay(hovered.day)} </span>
                      {hovered.uptime === null ? '—' : formatUptime(hovered.uptime)}
                    </span>
                  ) : overall === null ? (
                    <span className="text-text-muted">—</span>
                  ) : (
                    <span
                      className={cn(
                        overall >= 99.9
                          ? 'text-text-primary'
                          : overall >= 99
                            ? 'text-status-degraded'
                            : 'text-status-down',
                      )}
                    >
                      {formatUptime(overall)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex justify-between px-4 pb-3 pt-1 font-mono text-[10px] text-text-dim sm:pl-[calc(180px+2.25rem)] sm:pr-[calc(88px+2.25rem)]">
        <span>
          <span className="md:hidden">30d ago</span>
          <span className="hidden md:inline">{days}d ago</span>
        </span>
        <span>today</span>
      </div>
    </section>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-2.5 w-1.5 rounded-[1px]', className)} />
      {label}
    </span>
  );
}
