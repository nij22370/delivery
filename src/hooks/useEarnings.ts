"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDriverEarnings } from "@/api/apis/drivers/earningsApi";
import type { EarningsRange, EarningsResponse } from "@/types/earnings";

export function useEarnings(driverId: string | null, range: EarningsRange) {
  return useQuery<EarningsResponse>({
    queryKey: ["driverEarnings", driverId, range],
    queryFn: () => fetchDriverEarnings(driverId!, range),
    enabled: !!driverId,
    staleTime: 30_000,
  });
}
