// adminApi.ts - Plain async functions for the admin verification domain (no React/TanStack imports)
import api from "../../api";
import type {
  AdminVerificationQuery,
  AdminVerificationResponse,
  ApproveRejectInput,
  ApproveRejectResponse,
} from "@/types/admin/adminVerification";

const ADMIN_VERIFICATION_ENDPOINT = "/admin/verification";

export async function getVerificationQueue(
  query: AdminVerificationQuery
): Promise<AdminVerificationResponse> {
  const params: Record<string, string> = {};
  if (query.status !== undefined) params.status = query.status;
  if (query.search !== undefined) params.search = query.search;
  if (query.page !== undefined) params.page = String(query.page);
  if (query.limit !== undefined) params.limit = String(query.limit);

  const response = await api.get<AdminVerificationResponse>(ADMIN_VERIFICATION_ENDPOINT, {
    params,
  });
  return response.data;
}

export async function approveRejectDriver(
  id: string,
  data: ApproveRejectInput
): Promise<ApproveRejectResponse> {
  const response = await api.patch<ApproveRejectResponse>(
    `${ADMIN_VERIFICATION_ENDPOINT}/${id}`,
    data
  );
  return response.data;
}
