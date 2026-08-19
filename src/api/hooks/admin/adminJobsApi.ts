// adminJobsApi.ts - TanStack Query hooks for admin jobs domain
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { getAdminJobs, overrideJobStatus } from "../../apis/admin/adminJobsApi";
import type {
  AdminJobsQuery,
  AdminJobsResponse,
  StatusOverrideInput,
  StatusOverrideResponse,
} from "@/types/admin/adminJobs";

export const ADMIN_JOBS_QUERY_KEY = "adminJobs";

export function useAdminJobs(query: AdminJobsQuery) {
  return useQuery<AdminJobsResponse>({
    queryKey: [ADMIN_JOBS_QUERY_KEY, query],
    queryFn: () => getAdminJobs(query),
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useOverrideJobStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    StatusOverrideResponse,
    AxiosError<{ error?: string; message?: string }>,
    { id: string; data: StatusOverrideInput }
  >({
    mutationFn: ({ id, data }) => overrideJobStatus(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_JOBS_QUERY_KEY] });
      toast.success(result.message || "Job status updated successfully");
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to update job status";
      toast.error(errorMsg);
    },
  });
}
