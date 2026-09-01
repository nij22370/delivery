// profileApi.ts - TanStack Query hooks for the /api/profile domain.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getProfile, updateProfile } from "@/api/apis/profile/profileApi";
import type {
  ProfileInput,
  ProfileResponse,
} from "@/types/profile/profile";
import { PROFILE_STALE_TIME_MS } from "@/types/profile/profile";

export const PROFILE_QUERY_KEY = "profile";

export function useProfile() {
  return useQuery<ProfileResponse, AxiosError>({
    queryKey: [PROFILE_QUERY_KEY],
    queryFn: getProfile,
    staleTime: PROFILE_STALE_TIME_MS,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<ProfileResponse, AxiosError, ProfileInput>({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData([PROFILE_QUERY_KEY], data);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
