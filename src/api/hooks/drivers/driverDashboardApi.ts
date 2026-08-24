import { useQuery } from "@tanstack/react-query";
import { fetchDriverSummary } from "@/api/apis/drivers/driverDashboardApi";

const DRIVER_SUMMARY_QUERY_KEY = "driver-summary";
const STALE_TIME_MS = 30000;

export function useDriverSummary(driverId: string, enabled = true) {
  return useQuery({
    queryKey: [DRIVER_SUMMARY_QUERY_KEY, driverId],
    queryFn: () => fetchDriverSummary(driverId),
    enabled: Boolean(driverId) && enabled,
    staleTime: STALE_TIME_MS,
  });
}
