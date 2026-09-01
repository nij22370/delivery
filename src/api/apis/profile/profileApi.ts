// profileApi.ts - Plain async functions for the /api/profile domain.
import api from "@/api/api";
import type { ProfileInput, ProfileResponse } from "@/types/profile/profile";

const PROFILE_ENDPOINT = "/profile";

export async function getProfile(): Promise<ProfileResponse> {
  const response = await api.get<ProfileResponse>(PROFILE_ENDPOINT);
  return response.data;
}

export async function updateProfile(
  data: ProfileInput
): Promise<ProfileResponse> {
  const response = await api.patch<ProfileResponse>(PROFILE_ENDPOINT, data);
  return response.data;
}
