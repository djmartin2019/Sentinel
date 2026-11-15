import Link from 'next/link';
import { ArrowUpRight, CheckCircle, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { SeverityBadge } from '@/components/status/StatusPill';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Incident, IncidentSeverity } from '@/lib/types';

const severityIcon: Record<IncidentSeverity, React.ElementType> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};

const severityIconColor: Record<IncidentSeverity, string> = {
  critical: 'text-severity-critical',
  warning: 'text-severity-warning',
  info: 'text-severity-info',
};

interface IncidentFeedProps {
  incidents: Incident[];
}

export default function IncidentFeed({ incidents }: IncidentFeedProps) {
  const active = incidents.filter((i) => !i.resolved);
  const resolved = incidents.filter((i) => i.resolved).slice(0, 5);
  const all = [...active, ...resolved];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Incidents</h2>
          {active.length > 0 && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-status-down/15 text-status-down text-[10px] font-bold font-mono">
              {active.length}
            </span>
          )}
        </div>
        <Link
          href="/incidents"
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent-cyan transition-colors"
        >
          View all <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {all.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <CheckCircle className="w-5 h-5 text-status-up" strokeWidth={1.75} />
          <p className="text-xs text-text-secondary">No incidents in the last 30 days</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {all.map((incident) => {
            const Icon = severityIcon[incident.severity];
            return (
              <div
                key={incident.id}
                className={cn(
                  'px-4 py-3 transition-colors hover:bg-white/[0.025]',
                  !incident.resolved && incident.severity === 'critical' && 'border-l-2 border-l-severity-critical'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {incident.resolved ? (
                      <CheckCircle className="w-4 h-4 text-status-up" strokeWidth={1.75} />
                    ) : (
                      <Icon className={cn('w-4 h-4', severityIconColor[incident.severity])} strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-xs font-medium text-text-primary truncate">{incident.title}</p>
                      <SeverityBadge severity={incident.severity} />
                      {incident.resolved && (
                        <span className="text-[10px] font-mono text-status-up border border-status-up/25 bg-status-up/10 px-1.5 py-0.5 rounded-md">
                          RESOLVED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2 mb-1.5">
                      {incident.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
                      <span className="text-text-secondary bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-border">
                        {incident.targetName}
                      </span>
                      <span>{formatRelativeTime(incident.startedAt)}</span>
                      {incident.resolved && incident.resolvedAt && (
                        <span className="text-status-up">→ resolved {formatRelativeTime(incident.resolvedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
