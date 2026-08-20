// adminDisputesApi.ts - TanStack Query hooks for admin disputes domain
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { getAdminDisputes, resolveJobDispute } from "../../apis/admin/adminDisputesApi";
import type {
  DisputesQuery,
  DisputesResponse,
  ResolveJobInput,
  ResolveJobResponse,
} from "@/types/admin/adminDisputes";

export const ADMIN_DISPUTES_QUERY_KEY = "adminDisputes";

export function useAdminDisputes(query: DisputesQuery) {
  return useQuery<DisputesResponse>({
    queryKey: [ADMIN_DISPUTES_QUERY_KEY, query],
    queryFn: () => getAdminDisputes(query),
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useResolveJobDispute() {
  const queryClient = useQueryClient();

  return useMutation<
    ResolveJobResponse,
    AxiosError<{ error?: string; message?: string }>,
    { jobId: string; data: ResolveJobInput }
  >({
    mutationFn: ({ jobId, data }) => resolveJobDispute(jobId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_DISPUTES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
      toast.success(result.message || "Dispute resolved successfully");
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to resolve dispute";
      toast.error(errorMsg);
    },
  });
}
