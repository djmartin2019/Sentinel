import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { MonitoredTarget } from '@/lib/types';

interface StatusBannerProps {
  targets: MonitoredTarget[];
  activeIncidents: number;
}

export default function StatusBanner({ targets, activeIncidents }: StatusBannerProps) {
  const down = targets.filter((t) => t.status === 'DOWN').length;
  const degraded = targets.filter((t) => t.status === 'DEGRADED').length;
  const lastCheck = targets.reduce<string | null>(
    (latest, t) => (!latest || t.lastChecked > latest ? t.lastChecked : latest),
    null,
  );

  const tone = down > 0 || activeIncidents > 0 ? 'down' : degraded > 0 ? 'warn' : 'ok';

  const headline =
    tone === 'ok'
      ? `All ${targets.length} systems operational`
      : [
          down > 0 && `${down} down`,
          degraded > 0 && `${degraded} degraded`,
          activeIncidents > 0 &&
            `${activeIncidents} active incident${activeIncidents === 1 ? '' : 's'}`,
        ]
          .filter(Boolean)
          .join(' · ');

  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : XCircle;

  return (
    <div
      className={cn(
        'card flex flex-wrap items-center justify-between gap-3 overflow-hidden px-4 py-3.5 sm:px-5',
        tone === 'ok' && 'border-accent-cyan/25',
        tone === 'warn' && 'border-status-degraded/40',
        tone === 'down' && 'border-status-down/40',
      )}
    >
      {/* soft wash of the status color from the left */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-r to-transparent to-60%',
          tone === 'ok' && 'from-accent-cyan/12',
          tone === 'warn' && 'from-status-degraded/12',
          tone === 'down' && 'from-status-down/15',
        )}
      />
      <div className="relative flex items-center gap-3">
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border',
            tone === 'ok' && 'glow-cyan border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan',
            tone === 'warn' && 'border-status-degraded/40 bg-status-degraded/10 text-status-degraded',
            tone === 'down' && 'border-status-down/40 bg-status-down/10 text-status-down',
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight text-text-primary sm:text-base">
            {headline}
          </p>
          <p className="text-xs text-text-muted">
            Checking {targets.length} endpoints every minute
          </p>
        </div>
      </div>
      {lastCheck && (
        <p className="relative font-mono text-xs text-text-muted">
          last check <span className="text-text-secondary">{formatRelativeTime(lastCheck)}</span>
        </p>
      )}
    </div>
  );
}
