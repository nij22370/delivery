// driversApi.ts - TanStack Query hooks for driver verification domain
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { getDriverVerification, updateDriverVerification } from "../../apis/drivers/driversApi";
import { getBackendErrorMessage } from "@/lib/errorResponse";
import type {
  DriverProfileUpdateInput,
  GetDriverVerificationResponse,
  UpdateDriverVerificationResponse,
} from "@/types/driverProfile/driverProfile";

export const DRIVER_VERIFICATION_QUERY_KEY = ["driverVerification"];

export function useDriverVerification() {
  return useQuery<GetDriverVerificationResponse>({
    queryKey: DRIVER_VERIFICATION_QUERY_KEY,
    queryFn: getDriverVerification,
    retry: false,
  });
}

export function useUpdateDriverVerification(successMessage = "Documents submitted for review") {
  const queryClient = useQueryClient();
  return useMutation<UpdateDriverVerificationResponse, AxiosError, DriverProfileUpdateInput>({
    mutationFn: updateDriverVerification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRIVER_VERIFICATION_QUERY_KEY });
      toast.success(successMessage);
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error, "Failed to update verification");
      toast.error(message);
    },
  });
}