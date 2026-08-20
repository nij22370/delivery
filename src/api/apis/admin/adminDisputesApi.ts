// adminDisputesApi.ts - Plain async functions for admin disputes domain
import api from "../../api";
import type {
  DisputesQuery,
  DisputesResponse,
  ResolveJobInput,
  ResolveJobResponse,
} from "@/types/admin/adminDisputes";

const ADMIN_DISPUTES_ENDPOINT = "/admin/disputes";

export async function getAdminDisputes(
  query: DisputesQuery
): Promise<DisputesResponse> {
  const params: Record<string, string> = {};
  if (query.page !== undefined) params.page = String(query.page);
  if (query.limit !== undefined) params.limit = String(query.limit);
  if (query.search !== undefined && query.search.trim()) {
    params.search = query.search.trim();
  }

  const response = await api.get<DisputesResponse>(ADMIN_DISPUTES_ENDPOINT, { params });
  return response.data;
}

export async function resolveJobDispute(
  jobId: string,
  data: ResolveJobInput
): Promise<ResolveJobResponse> {
  const response = await api.patch<ResolveJobResponse>(
    `/admin/jobs/${jobId}/resolve`,
    data
  );
  return response.data;
}
