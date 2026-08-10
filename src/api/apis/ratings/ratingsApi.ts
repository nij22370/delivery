import api from "../../api";
import type {
  RatingSubmitInput,
  RatingSubmitResponse,
  RatingCheckResponse,
  DriverReviewsResponse,
} from "@/types/rating";

const RATINGS_ENDPOINT = "/ratings";
const DRIVERS_ENDPOINT = "/drivers";

export async function submitRating(data: RatingSubmitInput): Promise<RatingSubmitResponse> {
  const response = await api.post<RatingSubmitResponse>(RATINGS_ENDPOINT, data);
  return response.data;
}

export async function checkRating(jobId: string): Promise<RatingCheckResponse> {
  const response = await api.get<RatingCheckResponse>(`${RATINGS_ENDPOINT}/check`, {
    params: { jobId },
  });
  return response.data;
}

export async function getDriverReviews(
  driverId: string,
  page?: number,
  limit?: number
): Promise<DriverReviewsResponse> {
  const params: Record<string, string | number> = {};
  if (page !== undefined) params.page = page;
  if (limit !== undefined) params.limit = limit;
  const response = await api.get<DriverReviewsResponse>(
    `${DRIVERS_ENDPOINT}/${driverId}/reviews`,
    { params }
  );
  return response.data;
}
