import { useQuery } from "@tanstack/react-query";
import { getUserPublicProfile } from "../../apis/users/userPublicProfileApi";
import type { PublicProfileResponse } from "@/types/users/publicProfile";

export const USER_PUBLIC_PROFILE_QUERY_KEY = "user-public-profile";

export function useUserPublicProfile(userId: string | null) {
  return useQuery<PublicProfileResponse>({
    queryKey: [USER_PUBLIC_PROFILE_QUERY_KEY, userId],
    queryFn: () => getUserPublicProfile(userId!),
    enabled: !!userId,
    retry: false,
  });
}
