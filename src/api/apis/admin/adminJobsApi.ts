// adminJobsApi.ts - Plain async functions for admin jobs domain
import api from "../../api";
import type {
  AdminJobsQuery,
  AdminJobsResponse,
  StatusOverrideInput,
  StatusOverrideResponse,
} from "@/types/admin/adminJobs";

const ADMIN_JOBS_ENDPOINT = "/admin/jobs";

export async function getAdminJobs(query: AdminJobsQuery): Promise<AdminJobsResponse> {
  const params: Record<string, string> = {};
  if (query.status !== undefined && query.status !== "all") params.status = query.status;
  if (query.search !== undefined && query.search.trim()) params.search = query.search.trim();
  if (query.page !== undefined) params.page = String(query.page);
  if (query.limit !== undefined) params.limit = String(query.limit);
  if (query.sortBy !== undefined) params.sortBy = query.sortBy;
  if (query.sortOrder !== undefined) params.sortOrder = query.sortOrder;

  const response = await api.get<AdminJobsResponse>(ADMIN_JOBS_ENDPOINT, { params });
  return response.data;
}

export async function overrideJobStatus(
  id: string,
  data: StatusOverrideInput
): Promise<StatusOverrideResponse> {
  const response = await api.patch<StatusOverrideResponse>(
    `${ADMIN_JOBS_ENDPOINT}/${id}/status`,
    data
  );
  return response.data;
}
