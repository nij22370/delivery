import { z } from "zod";

const RATING_MIN = 1;
const RATING_MAX = 5;

export const ratingSubmitSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  toUserId: z.string().min(1, "Recipient user ID is required"),
  score: z
    .number()
    .int("Score must be a whole number")
    .min(RATING_MIN, `Score must be at least ${RATING_MIN}`)
    .max(RATING_MAX, `Score must be at most ${RATING_MAX}`),
  comment: z.string().optional(),
});

export type RatingSubmitInput = z.infer<typeof ratingSubmitSchema>;

export interface RatingResponse {
  _id: string;
  jobId: string;
  fromUserId: string;
  toUserId: string;
  score: number;
  comment?: string | null;
  createdAt: string;
}

export interface RatingSubmitResponse {
  rating: RatingResponse;
}

export interface RatingCheckResponse {
  rated: boolean;
}

export interface ReviewItem {
  _id: string;
  score: number;
  comment?: string | null;
  createdAt: string;
  fromUserId: {
    _id: string;
    name: string;
  };
}

export interface DriverReviewsResponse {
  reviews: ReviewItem[];
  total: number;
  page: number;
  totalPages: number;
}
