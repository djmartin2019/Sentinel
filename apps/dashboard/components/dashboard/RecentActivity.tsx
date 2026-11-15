import { AlertTriangle, ArrowUpCircle, XCircle, CheckCircle } from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { ActivityEvent } from '@/lib/types';

const typeConfig: Record<ActivityEvent['type'], { icon: React.ElementType; color: string }> = {
  check: { icon: CheckCircle, color: 'text-status-up' },
  incident: { icon: XCircle, color: 'text-status-down' },
  recovery: { icon: ArrowUpCircle, color: 'text-status-up' },
  alert: { icon: AlertTriangle, color: 'text-status-degraded' },
};

interface RecentActivityProps {
  events: ActivityEvent[];
}

export default function RecentActivity({ events }: RecentActivityProps) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Status changes</h2>
        <p className="mt-0.5 text-xs text-text-muted">Up / slow / down transitions · last 7 days</p>
      </div>

      {events.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-text-muted">
          No status changes in the last 7 days
        </div>
      ) : (
        <ol className="relative max-h-[360px] overflow-y-auto py-1">
          <div aria-hidden className="absolute bottom-0 left-[25px] top-0 w-px bg-border" />
          {events.map((event) => {
            const { icon: Icon, color } = typeConfig[event.type];
            return (
              <li key={event.id} className="relative flex items-start gap-3 px-4 py-2">
                <span
                  className={cn(
                    'relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-bg-base',
                    color,
                  )}
                >
                  <Icon className="h-3 w-3" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-medium text-text-primary">
                      {event.targetName}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-text-muted">
                      {formatRelativeTime(event.timestamp)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-text-muted">{event.message}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
