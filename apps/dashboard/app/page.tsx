import Header from "@/components/layout/Header";
import SummaryCards from "@/components/dashboard/SummaryCards";
import ServicesTable from "@/components/dashboard/ServicesTable";
import IncidentFeed from "@/components/incidents/IncidentFeed";
import RecentActivity from "@/components/dashboard/RecentActivity";
import LatencyChart from "@/components/charts/LatencyChart";
import UptimeChart from "@/components/charts/UptimeChart";
import { getOverviewPageData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const {
    targets,
    stats,
    latencyData,
    uptimeData,
    activeIncidents,
    resolvedIncidents,
    activityEvents,
  } = await getOverviewPageData();

  const incidents = [...activeIncidents, ...resolvedIncidents.slice(0, 2)];

  return (
    <>
      <Header
        title="Overview"
        subtitle="Infrastructure health · live from database"
      />
      <div className="space-y-5 p-4 sm:p-5 max-w-[1600px]">
        <SummaryCards stats={stats} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <LatencyChart data={latencyData} />
          <UptimeChart data={uptimeData} />
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
