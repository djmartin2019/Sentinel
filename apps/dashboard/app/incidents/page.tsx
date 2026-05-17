import { CheckCircle, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import Header from '@/components/layout/Header';
import { SeverityBadge } from '@/components/status/StatusPill';
import { getActiveIncidents, getRecentIncidents } from '@/lib/queries';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { IncidentSeverity } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

export default async function IncidentsPage() {
  const [active, resolved] = await Promise.all([
    getActiveIncidents(),
    getRecentIncidents(),
  ]);

  return (
    <>
      <Header title="Incidents" subtitle={`${active.length} active · ${resolved.length} resolved`} />
      <div className="p-5 max-w-[1600px] space-y-5">
        {active.length > 0 && (
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-widest text-text-muted mb-3">Active</h2>
            <div className="space-y-3">
              {active.map((incident) => {
                const Icon = severityIcon[incident.severity];
                return (
                  <div
                    key={incident.id}
                    className={cn(
                      'rounded border bg-bg-card p-4',
                      incident.severity === 'critical'
                        ? 'border-severity-critical/40 border-l-2 border-l-severity-critical'
                        : 'border-border'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', severityIconColor[incident.severity])} strokeWidth={1.75} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-sm font-semibold text-text-primary">{incident.title}</h3>
                          <SeverityBadge severity={incident.severity} />
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed mb-3">{incident.description}</p>
                        <div className="flex items-center gap-4 text-[11px] font-mono text-text-muted">
                          <span>
                            Target: <span className="text-text-secondary">{incident.targetName}</span>
                          </span>
                          <span>
                            Started: <span className="text-text-secondary">{formatRelativeTime(incident.startedAt)}</span>
                          </span>
                          <span className="text-status-down">Ongoing</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {active.length === 0 && (
          <p className="text-xs font-mono text-text-muted">No active incidents — all targets passing checks.</p>
        )}

        <section>
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-text-muted mb-3">Resolved</h2>
          {resolved.length === 0 ? (
            <p className="text-xs font-mono text-text-muted">No recently resolved incidents.</p>
          ) : (
            <div className="rounded border border-border bg-bg-card overflow-hidden divide-y divide-border/50">
              {resolved.map((incident) => (
                <div key={incident.id} className="flex items-start gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-status-up" strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-xs font-medium text-text-primary">{incident.title}</p>
                      <SeverityBadge severity={incident.severity} />
                      <span className="text-[10px] font-mono text-status-up border border-status-up/25 bg-status-up/8 px-1.5 py-0.5 rounded-sm">
                        RESOLVED
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted line-clamp-1">{incident.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-text-muted">
                      <span>{incident.targetName}</span>
                      <span>{formatRelativeTime(incident.startedAt)}</span>
                      {incident.resolvedAt && (
                        <span className="text-status-up">resolved {formatRelativeTime(incident.resolvedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
