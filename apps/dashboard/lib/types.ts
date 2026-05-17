export type TargetStatus = 'UP' | 'DOWN' | 'DEGRADED';
export type IncidentSeverity = 'critical' | 'warning' | 'info';
export type CheckStatus = 'UP' | 'DOWN';
export type Region = 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1' | 'ap-northeast-1';

export interface MonitoredTarget {
  id: string;
  name: string;
  url: string;
  interval: number;
  status: TargetStatus;
  latencyMs: number;
  uptime: number;
  lastChecked: string;
  region: Region;
  createdAt: string;
  tags: string[];
}

export interface HealthCheck {
  id: string;
  targetId: string;
  status: CheckStatus;
  statusCode?: number;
  latencyMs?: number;
  errorMessage?: string;
  checkedAt: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  targetId: string;
  targetName: string;
  startedAt: string;
  resolvedAt?: string;
  resolved: boolean;
  description: string;
}

export interface LatencyDataPoint {
  time: string;
  latencyMs: number;
  p95Ms: number;
  p99Ms: number;
}

export interface UptimeDataPoint {
  date: string;
  uptime: number;
}

export interface ActivityEvent {
  id: string;
  type: 'check' | 'incident' | 'recovery' | 'alert';
  message: string;
  targetName: string;
  timestamp: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
}
