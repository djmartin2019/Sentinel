import { CheckCircle, AlertTriangle, ArrowUpCircle, Bell } from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { ActivityEvent } from '@/lib/types';

const typeConfig: Record<ActivityEvent['type'], { icon: React.ElementType; color: string }> = {
  check: { icon: CheckCircle, color: 'text-status-up' },
  incident: { icon: AlertTriangle, color: 'text-status-down' },
  recovery: { icon: ArrowUpCircle, color: 'text-status-up' },
  alert: { icon: Bell, color: 'text-status-degraded' },
};

const statusDot: Record<string, string> = {
  UP: 'bg-status-up',
  DOWN: 'bg-status-down',
  DEGRADED: 'bg-status-degraded',
};

interface RecentActivityProps {
  events: ActivityEvent[];
}

export default function RecentActivity({ events }: RecentActivityProps) {
  return (
    <div className="rounded border border-border bg-bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Activity</h2>
        <p className="text-[11px] text-text-muted mt-0.5">Last 24 hours</p>
      </div>

      {events.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs font-mono text-text-muted">
          No recent activity
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[27px] top-0 bottom-0 w-px bg-border/60" />
          <div className="divide-y divide-border/30">
            {events.map((event) => {
              const { icon: Icon, color } = typeConfig[event.type];
              return (
                <div key={event.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-bg-elevated transition-colors">
                  <div className={cn('relative z-10 flex items-center justify-center w-5 h-5 rounded-full bg-bg-card border border-border shrink-0 mt-0.5', color)}>
                    <Icon className="w-2.5 h-2.5" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusDot[event.status])} />
                      <span className="font-mono text-[11px] font-medium text-text-secondary">{event.targetName}</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-snug">{event.message}</p>
                    <p className="text-[10px] font-mono text-text-dim mt-0.5">{formatRelativeTime(event.timestamp)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
