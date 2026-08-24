import { apiFetch } from "@/utils/apiFetch";
import type { DriverSummaryResponse } from "@/types/drivers/driverDashboard";

const DRIVERS_ENDPOINT_BASE = "/api/drivers";

export async function fetchDriverSummary(driverId: string): Promise<DriverSummaryResponse> {
  const response = await apiFetch(`${DRIVERS_ENDPOINT_BASE}/${driverId}/summary`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error ?? "Failed to fetch driver summary.");
  }
  return response.json();
}
