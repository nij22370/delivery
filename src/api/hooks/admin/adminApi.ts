// adminApi.ts - TanStack Query hooks for the admin verification domain
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { getVerificationQueue, approveRejectDriver } from "../../apis/admin/adminApi";
import type {
  AdminVerificationQuery,
  AdminVerificationResponse,
  ApproveRejectInput,
  ApproveRejectResponse,
} from "@/types/admin/adminVerification";

export const ADMIN_VERIFICATION_QUERY_KEY = "adminVerificationQueue";

export function useVerificationQueue(query: AdminVerificationQuery) {
  return useQuery<AdminVerificationResponse>({
    queryKey: [ADMIN_VERIFICATION_QUERY_KEY, query],
    queryFn: () => getVerificationQueue(query),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useApproveRejectDriver() {
  const queryClient = useQueryClient();

  return useMutation<
    ApproveRejectResponse,
    AxiosError,
    { id: string; data: ApproveRejectInput }
  >({
    mutationFn: ({ id, data }) => approveRejectDriver(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_VERIFICATION_QUERY_KEY] });
      if (variables.data.status === "approved") {
        toast.success("Driver approved successfully");
      } else {
        toast.error("Driver rejected");
      }
    },
    onError: () => {
      toast.error("Action failed. Please try again.");
    },
  });
}
