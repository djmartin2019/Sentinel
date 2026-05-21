/**
 * @deprecated Import from `@/lib/data` instead. Re-exports preserved for compatibility.
 */
export {
  getOverviewPageData,
  getActiveIncidents,
  getRecentIncidents,
  getActivityFeed,
  getTargetsWithStatus,
  getSummaryStats,
  getTargetById,
  getRecentChecks,
  getLatencyTimeSeries,
  getUptimeTimeSeries,
  type OverviewPageData,
} from "./data";

export type { SummaryStats } from "./types";
