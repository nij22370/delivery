// payoutsApi.ts - TanStack Query hooks for driver payouts domain
import { useQuery } from "@tanstack/react-query";
import { fetchDriverPayouts } from "../../apis/drivers/payoutsApi";
import type { GetDriverPayoutsResponse } from "@/types/payout/payout";

export const DRIVER_PAYOUTS_QUERY_KEY = ["driverPayouts"];

export function useDriverPayouts(enabled = true) {
  return useQuery<GetDriverPayoutsResponse>({
    queryKey: DRIVER_PAYOUTS_QUERY_KEY,
    queryFn: fetchDriverPayouts,
    enabled,
    staleTime: 30_000,
  });
}
