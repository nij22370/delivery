// payoutsApi.ts - Plain async functions for driver payouts domain (no React/TanStack imports)
import api from "../../api";
import type { GetDriverPayoutsResponse } from "@/types/payout/payout";

const DRIVER_PAYOUTS_ENDPOINT = "/drivers/payouts";

export async function fetchDriverPayouts(): Promise<GetDriverPayoutsResponse> {
  const response = await api.get<GetDriverPayoutsResponse>(DRIVER_PAYOUTS_ENDPOINT);
  return response.data;
}
