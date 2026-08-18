import api from "@/api/api";
import type { EarningsRange, EarningsResponse } from "@/types/earnings";

const DRIVER_EARNINGS_ENDPOINT = "/drivers";

export async function fetchDriverEarnings(
  driverId: string,
  range: EarningsRange
): Promise<EarningsResponse> {
  const response = await api.get<EarningsResponse>(
    `${DRIVER_EARNINGS_ENDPOINT}/${driverId}/earnings`,
    { params: { range } }
  );
  return response.data;
}
