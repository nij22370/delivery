// adminPayoutsApi.ts - Plain async functions for admin payouts domain
import api from "../../api";
import type {
  AdminPayoutsQuery,
  AdminPayoutsResponse,
  PayoutOverrideInput,
  PayoutOverrideResponse,
} from "@/types/admin/adminPayouts";

const ADMIN_PAYOUTS_ENDPOINT = "/admin/payouts";

export async function getAdminPayouts(
  query: AdminPayoutsQuery
): Promise<AdminPayoutsResponse> {
  const params: Record<string, string> = {};
  if (query.page !== undefined) params.page = String(query.page);
  if (query.limit !== undefined) params.limit = String(query.limit);
  if (query.status) params.status = query.status;
  if (query.driverId) params.driverId = query.driverId;
  if (query.search) params.search = query.search;
  if (query.gateway) params.gateway = query.gateway;
  if (query.days) params.days = query.days;

  const response = await api.get<AdminPayoutsResponse>(ADMIN_PAYOUTS_ENDPOINT, { params });
  return response.data;
}

export async function overridePayoutStatus(
  id: string,
  data: PayoutOverrideInput
): Promise<PayoutOverrideResponse> {
  const response = await api.patch<PayoutOverrideResponse>(
    `${ADMIN_PAYOUTS_ENDPOINT}/${id}`,
    data
  );
  return response.data;
}
