import { cn } from '@/lib/utils';
import type { TargetStatus, IncidentSeverity } from '@/lib/types';

interface StatusPillProps {
  status: TargetStatus;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig: Record<TargetStatus, { label: string; dot: string; pill: string }> = {
  UP: {
    label: 'UP',
    dot: 'bg-status-up',
    pill: 'bg-status-up/10 text-status-up border-status-up/25',
  },
  DOWN: {
    label: 'DOWN',
    dot: 'bg-status-down',
    pill: 'bg-status-down/10 text-status-down border-status-down/25',
  },
  DEGRADED: {
    label: 'DEGRADED',
    dot: 'bg-status-degraded',
    pill: 'bg-status-degraded/10 text-status-degraded border-status-degraded/25',
  },
};

export function StatusPill({ status, pulse = false, size = 'md' }: StatusPillProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border font-mono font-medium tracking-wider',
        config.pill,
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      )}
    >
      <span className="relative flex shrink-0 w-1.5 h-1.5">
        {pulse && status !== 'UP' && (
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', config.dot)} />
        )}
        <span className={cn('relative inline-flex rounded-full w-1.5 h-1.5', config.dot)} />
      </span>
      {config.label}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: IncidentSeverity;
}

const severityConfig: Record<IncidentSeverity, { label: string; classes: string }> = {
  critical: { label: 'CRITICAL', classes: 'bg-severity-critical/10 text-severity-critical border-severity-critical/30' },
  warning: { label: 'WARNING', classes: 'bg-severity-warning/10 text-severity-warning border-severity-warning/30' },
  info: { label: 'INFO', classes: 'bg-severity-info/10 text-severity-info border-severity-info/30' },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  return (
    <span className={cn('inline-flex items-center rounded-sm border font-mono font-medium tracking-wider text-[10px] px-1.5 py-0.5', config.classes)}>
      {config.label}
    </span>
  );
}
