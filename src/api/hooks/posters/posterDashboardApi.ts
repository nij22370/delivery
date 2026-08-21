// posterDashboardApi.ts - TanStack Query hooks for poster dashboard domain
import { useQuery } from "@tanstack/react-query";
import { getPosterSummary } from "../../apis/posters/posterDashboardApi";
import type { PosterSummaryResponse } from "@/types/poster/posterDashboard";

export const POSTER_SUMMARY_QUERY_KEY = "posterSummary";

export function usePosterSummary(posterId: string | null) {
  return useQuery<PosterSummaryResponse>({
    queryKey: [POSTER_SUMMARY_QUERY_KEY, posterId],
    queryFn: () => getPosterSummary(posterId!),
    enabled: Boolean(posterId),
    staleTime: 30_000,
  });
}
