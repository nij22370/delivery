// posterDashboardApi.ts - Plain async functions for poster dashboard domain
import api from "../../api";
import type { PosterSummaryResponse } from "@/types/poster/posterDashboard";

const POSTER_SUMMARY_ENDPOINT = "/posters";

export async function getPosterSummary(posterId: string): Promise<PosterSummaryResponse> {
  const response = await api.get<PosterSummaryResponse>(`${POSTER_SUMMARY_ENDPOINT}/${posterId}/summary`);
  return response.data;
}
