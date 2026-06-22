import Header from "@/components/layout/Header";
import SummaryCards from "@/components/dashboard/SummaryCards";
import ServicesTable from "@/components/dashboard/ServicesTable";
import IncidentFeed from "@/components/incidents/IncidentFeed";
import RecentActivity from "@/components/dashboard/RecentActivity";
import LatencyChart from "@/components/charts/LatencyChart";
import UptimeChart from "@/components/charts/UptimeChart";
import { getOverviewPageData, parseLatencyRange } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; range?: string }>;
}) {
  const { target: rawTargetId, range: rawRange } = await searchParams;
  const range = parseLatencyRange(rawRange);
  const {
    targets,
    stats,
    latencyData,
    uptimeData,
    activeIncidents,
    resolvedIncidents,
    activityEvents,
  } = await getOverviewPageData(rawTargetId, range);

  // Ignore invalid IDs, fall back to "all targets"
  const selectedTarget = rawTargetId
    ? targets.find((t) => t.id === rawTargetId)
    : undefined;

  const incidents = [...activeIncidents, ...resolvedIncidents.slice(0, 5)];

  return (
    <>
      <Header
        title="Overview"
        subtitle="Infrastructure health · live from database"
      />
      <div className="space-y-5 p-4 sm:p-5 max-w-[1600px]">
        <SummaryCards stats={stats} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <LatencyChart
            data={latencyData}
            targets={targets.map((t) => ({ id: t.id, name: t.name }))}
            selectedTargetId={selectedTarget?.id}
            selectedRange={range}
          />
          <UptimeChart
            data={uptimeData}
            targets={targets.map((t) => ({ id: t.id, name: t.name }))}
            selectedTargetId={selectedTarget?.id}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <ServicesTable targets={targets} />
          </div>
          <div className="space-y-4">
            <IncidentFeed incidents={incidents} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1">
            <RecentActivity events={activityEvents} />
          </div>
          <div className="xl:col-span-2 rounded border border-border bg-bg-card p-4 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs font-mono text-text-muted">
                Telemetry heatmap — coming soon
              </p>
              <p className="text-[11px] text-text-dim mt-1">
                Connect telemetry-collector to enable
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
