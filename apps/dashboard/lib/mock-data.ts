import type {
  MonitoredTarget,
  Incident,
  LatencyDataPoint,
  UptimeDataPoint,
  ActivityEvent,
} from './types';

export const targets: MonitoredTarget[] = [
  {
    id: 'tgt_01',
    name: 'api-gateway',
    url: 'https://api.sentinel.internal/health',
    interval: 30,
    status: 'UP',
    latencyMs: 42,
    uptime: 99.98,
    lastChecked: new Date(Date.now() - 12000).toISOString(),
    region: 'us-east-1',
    createdAt: '2026-01-15T00:00:00Z',
    tags: ['core', 'api'],
  },
  {
    id: 'tgt_02',
    name: 'auth-service',
    url: 'https://auth.sentinel.internal/ping',
    interval: 30,
    status: 'UP',
    latencyMs: 88,
    uptime: 99.95,
    lastChecked: new Date(Date.now() - 8000).toISOString(),
    region: 'us-east-1',
    createdAt: '2026-01-15T00:00:00Z',
    tags: ['core', 'auth'],
  },
  {
    id: 'tgt_03',
    name: 'postgres-primary',
    url: 'https://db-proxy.sentinel.internal/health',
    interval: 15,
    status: 'UP',
    latencyMs: 6,
    uptime: 99.99,
    lastChecked: new Date(Date.now() - 5000).toISOString(),
    region: 'us-east-1',
    createdAt: '2026-01-10T00:00:00Z',
    tags: ['database', 'core'],
  },
  {
    id: 'tgt_04',
    name: 'vercel-edge',
    url: 'https://edge.djm-tech.dev',
    interval: 60,
    status: 'DEGRADED',
    latencyMs: 1240,
    uptime: 98.71,
    lastChecked: new Date(Date.now() - 22000).toISOString(),
    region: 'us-west-2',
    createdAt: '2026-02-01T00:00:00Z',
    tags: ['frontend', 'edge'],
  },
  {
    id: 'tgt_05',
    name: 'docker-host-01',
    url: 'http://10.0.1.12:9090/metrics',
    interval: 30,
    status: 'DOWN',
    latencyMs: 0,
    uptime: 94.23,
    lastChecked: new Date(Date.now() - 35000).toISOString(),
    region: 'us-east-1',
    createdAt: '2026-01-20T00:00:00Z',
    tags: ['infrastructure', 'docker'],
  },
  {
    id: 'tgt_06',
    name: 'telemetry-collector',
    url: 'https://telemetry.sentinel.internal/ready',
    interval: 30,
    status: 'UP',
    latencyMs: 31,
    uptime: 99.91,
    lastChecked: new Date(Date.now() - 9000).toISOString(),
    region: 'eu-west-1',
    createdAt: '2026-02-10T00:00:00Z',
    tags: ['observability'],
  },
  {
    id: 'tgt_07',
    name: 'redis-cache',
    url: 'https://cache-proxy.sentinel.internal/ping',
    interval: 15,
    status: 'UP',
    latencyMs: 3,
    uptime: 99.99,
    lastChecked: new Date(Date.now() - 4000).toISOString(),
    region: 'us-east-1',
    createdAt: '2026-01-18T00:00:00Z',
    tags: ['cache', 'core'],
  },
  {
    id: 'tgt_08',
    name: 'worker-queue',
    url: 'https://queue.sentinel.internal/health',
    interval: 60,
    status: 'UP',
    latencyMs: 54,
    uptime: 99.87,
    lastChecked: new Date(Date.now() - 18000).toISOString(),
    region: 'ap-southeast-1',
    createdAt: '2026-02-05T00:00:00Z',
    tags: ['queue', 'async'],
  },
];

export const incidents: Incident[] = [
  {
    id: 'inc_01',
    title: 'docker-host-01 unreachable',
    severity: 'critical',
    targetId: 'tgt_05',
    targetName: 'docker-host-01',
    startedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    resolved: false,
    description: 'Host failed health check. TCP connection refused on port 9090. Possible kernel panic or OOM event.',
  },
  {
    id: 'inc_02',
    title: 'vercel-edge elevated latency',
    severity: 'warning',
    targetId: 'tgt_04',
    targetName: 'vercel-edge',
    startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    resolved: false,
    description: 'P95 latency exceeded 1s threshold. Edge function cold starts suspected in us-west-2.',
  },
  {
    id: 'inc_03',
    title: 'auth-service latency spike',
    severity: 'warning',
    targetId: 'tgt_02',
    targetName: 'auth-service',
    startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    resolved: true,
    description: 'JWT validation latency spiked to 340ms during token refresh storm. Resolved after cache warm-up.',
  },
  {
    id: 'inc_04',
    title: 'postgres-primary replication lag',
    severity: 'info',
    targetId: 'tgt_03',
    targetName: 'postgres-primary',
    startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 5.8 * 60 * 60 * 1000).toISOString(),
    resolved: true,
    description: 'Replication lag reached 18s during large batch write. Replica caught up automatically.',
  },
];

function generateLatencyData(): LatencyDataPoint[] {
  const points: LatencyDataPoint[] = [];
  const now = Date.now();
  for (let i = 60; i >= 0; i--) {
    const base = 45 + Math.random() * 30;
    const spike = i === 35 || i === 14 ? Math.random() * 600 + 400 : 0;
    const latency = Math.round(base + spike);
    points.push({
      time: new Date(now - i * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      latencyMs: latency,
      p95Ms: Math.round(latency * 1.6),
      p99Ms: Math.round(latency * 2.1),
    });
  }
  return points;
}

function generateUptimeData(): UptimeDataPoint[] {
  const points: UptimeDataPoint[] = [];
  const now = Date.now();
  for (let i = 30; i >= 0; i--) {
    const base = 99.9;
    const dip = i === 22 ? -5.77 : i === 8 ? -1.2 : 0;
    points.push({
      date: new Date(now - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      uptime: Math.min(100, Math.max(90, base + dip + (Math.random() - 0.5) * 0.08)),
    });
  }
  return points;
}

export const latencyData = generateLatencyData();
export const uptimeData = generateUptimeData();

export const activityEvents: ActivityEvent[] = [
  { id: 'evt_01', type: 'incident', message: 'Host unreachable — connection refused', targetName: 'docker-host-01', timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), status: 'DOWN' },
  { id: 'evt_02', type: 'alert', message: 'Latency threshold breached (>1s)', targetName: 'vercel-edge', timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), status: 'DEGRADED' },
  { id: 'evt_03', type: 'check', message: 'Health check passed — 42ms', targetName: 'api-gateway', timestamp: new Date(Date.now() - 12000).toISOString(), status: 'UP' },
  { id: 'evt_04', type: 'check', message: 'Health check passed — 3ms', targetName: 'redis-cache', timestamp: new Date(Date.now() - 16000).toISOString(), status: 'UP' },
  { id: 'evt_05', type: 'recovery', message: 'Service recovered after 18m downtime', targetName: 'auth-service', timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), status: 'UP' },
  { id: 'evt_06', type: 'check', message: 'Health check passed — 31ms', targetName: 'telemetry-collector', timestamp: new Date(Date.now() - 9000).toISOString(), status: 'UP' },
  { id: 'evt_07', type: 'recovery', message: 'Replication lag resolved automatically', targetName: 'postgres-primary', timestamp: new Date(Date.now() - 5.8 * 60 * 60 * 1000).toISOString(), status: 'UP' },
  { id: 'evt_08', type: 'check', message: 'Health check passed — 54ms', targetName: 'worker-queue', timestamp: new Date(Date.now() - 18000).toISOString(), status: 'UP' },
];

export const summaryStats = {
  totalTargets: targets.length,
  healthyTargets: targets.filter((t) => t.status === 'UP').length,
  activeIncidents: incidents.filter((i) => !i.resolved).length,
  avgLatencyMs: Math.round(targets.filter((t) => t.status !== 'DOWN').reduce((acc, t) => acc + t.latencyMs, 0) / targets.filter((t) => t.status !== 'DOWN').length),
  avgUptimePercent: parseFloat((targets.reduce((acc, t) => acc + t.uptime, 0) / targets.length).toFixed(2)),
};
