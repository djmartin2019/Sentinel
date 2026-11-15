import { connection } from 'next/server';
import { getActiveIncidents, getTargetsWithStatus } from '@/lib/data';
import { cn } from '@/lib/utils';

type Tone = 'ok' | 'warn' | 'down' | 'unknown';

const toneDot: Record<Tone, string> = {
  ok: 'bg-status-up',
  warn: 'bg-status-degraded',
  down: 'bg-status-down',
  unknown: 'bg-text-dim',
};

function StatusLine({ tone, label }: { tone: Tone; label: string }) {
  return (
    <div className="mx-2 mb-2 rounded-lg border border-border bg-bg-elevated/60 px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <span className="relative flex h-2 w-2 shrink-0">
          {tone !== 'unknown' && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-50',
                toneDot[tone],
              )}
            />
          )}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', toneDot[tone])} />
        </span>
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}

export function SystemStatusFallback() {
  return <StatusLine tone="unknown" label="Checking status…" />;
}

async function loadStatus(): Promise<{ tone: Tone; label: string }> {
  try {
    const [targets, incidents] = await Promise.all([
      getTargetsWithStatus(),
      getActiveIncidents(),
    ]);
    const down = targets.filter((t) => t.status === 'DOWN').length;
    const degraded = targets.filter((t) => t.status === 'DEGRADED').length;

    if (down > 0 || incidents.length > 0) {
      const n = Math.max(down, incidents.length);
      return { tone: 'down', label: `${n} system${n === 1 ? '' : 's'} down` };
    }
    if (degraded > 0) return { tone: 'warn', label: `${degraded} degraded` };
    return { tone: 'ok', label: 'All systems operational' };
  } catch {
    return { tone: 'unknown', label: 'Status unavailable' };
  }
}

export default async function SystemStatus() {
  await connection();
  const { tone, label } = await loadStatus();
  return <StatusLine tone={tone} label={label} />;
}
