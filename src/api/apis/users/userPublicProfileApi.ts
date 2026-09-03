import api from "../../api";
import type { PublicProfileResponse } from "@/types/users/publicProfile";

const USERS_ENDPOINT = "/users";

export async function getUserPublicProfile(
  userId: string
): Promise<PublicProfileResponse> {
  const response = await api.get<PublicProfileResponse>(
    `${USERS_ENDPOINT}/${userId}`
  );
  return response.data;
}
