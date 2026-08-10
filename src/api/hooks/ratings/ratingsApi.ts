import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { submitRating, checkRating, getDriverReviews } from "../../apis/ratings/ratingsApi";
import { getBackendErrorMessage } from "@/lib/errorResponse";
import type {
  RatingSubmitInput,
  RatingSubmitResponse,
  RatingCheckResponse,
  DriverReviewsResponse,
} from "@/types/rating";

export const RATINGS_QUERY_KEY = "ratings";
export const DRIVER_REVIEWS_QUERY_KEY = "driver-reviews";

export function useSubmitRating() {
  const queryClient = useQueryClient();
  return useMutation<RatingSubmitResponse, AxiosError, RatingSubmitInput>({
    mutationFn: submitRating,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [RATINGS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [DRIVER_REVIEWS_QUERY_KEY, variables.toUserId],
      });
      toast.success("Review submitted successfully");
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error, "Failed to submit review");
      toast.error(message);
    },
  });
}

export function useCheckRating(jobId: string | null) {
  return useQuery<RatingCheckResponse>({
    queryKey: [RATINGS_QUERY_KEY, "check", jobId],
    queryFn: () => checkRating(jobId!),
    enabled: !!jobId,
    retry: false,
  });
}

export function useDriverReviews(driverId: string | null) {
  return useQuery<DriverReviewsResponse>({
    queryKey: [DRIVER_REVIEWS_QUERY_KEY, driverId],
    queryFn: () => getDriverReviews(driverId!),
    enabled: !!driverId,
    retry: false,
  });
}
