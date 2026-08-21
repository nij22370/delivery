// adminPayoutsApi.ts - TanStack Query hooks for admin payouts domain
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { getAdminPayouts, overridePayoutStatus } from "../../apis/admin/adminPayoutsApi";
import type {
  AdminPayoutsQuery,
  AdminPayoutsResponse,
  PayoutOverrideInput,
  PayoutOverrideResponse,
} from "@/types/admin/adminPayouts";

export const ADMIN_PAYOUTS_QUERY_KEY = "adminPayouts";

export function useAdminPayouts(query: AdminPayoutsQuery) {
  return useQuery<AdminPayoutsResponse>({
    queryKey: [ADMIN_PAYOUTS_QUERY_KEY, query],
    queryFn: () => getAdminPayouts(query),
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useOverridePayoutStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    PayoutOverrideResponse,
    AxiosError<{ error?: string; message?: string }>,
    { id: string; data: PayoutOverrideInput }
  >({
    mutationFn: ({ id, data }) => overridePayoutStatus(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_PAYOUTS_QUERY_KEY] });
      toast.success(result.message || "Payout updated successfully");
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to update payout";
      toast.error(errorMsg);
    },
  });
}
