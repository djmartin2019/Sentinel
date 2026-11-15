import Header from "@/components/layout/Header";
import StatusBanner from "@/components/dashboard/StatusBanner";
import SummaryCards from "@/components/dashboard/SummaryCards";
import UptimeBars from "@/components/dashboard/UptimeBars";
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
    dailyUptimeByTarget,
  } = await getOverviewPageData(rawTargetId, range);

  // Ignore invalid IDs, fall back to "all targets"
  const selectedTarget = rawTargetId
    ? targets.find((t) => t.id === rawTargetId)
    : undefined;

  const incidents = [...activeIncidents, ...resolvedIncidents.slice(0, 5)];
  const targetOptions = targets.map((t) => ({ id: t.id, name: t.name }));

  return (
    <>
      <Header title="Overview" subtitle="Uptime & incidents across all targets" />
      <div className="mx-auto max-w-[1400px] space-y-4 p-4 sm:p-6">
        <StatusBanner targets={targets} activeIncidents={activeIncidents.length} />

        <SummaryCards stats={stats} />

        <UptimeBars targets={targets} dailyUptimeByTarget={dailyUptimeByTarget} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <LatencyChart
            data={latencyData}
            targets={targetOptions}
            selectedTargetId={selectedTarget?.id}
            selectedRange={range}
          />
          <UptimeChart
            data={uptimeData}
            targets={targetOptions}
            selectedTargetId={selectedTarget?.id}
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ServicesTable targets={targets} />
          </div>
          <div className="space-y-4">
            <IncidentFeed incidents={incidents} />
            <RecentActivity events={activityEvents} />
          </div>
        </div>
      </div>
    </>
  );
}
