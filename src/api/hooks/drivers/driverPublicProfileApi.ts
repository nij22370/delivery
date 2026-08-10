import { useQuery } from "@tanstack/react-query";
import { getDriverPublicProfile } from "../../apis/drivers/driverPublicProfileApi";
import type { DriverPublicProfileResponse } from "@/types/drivers/driverPublicProfile";

export const DRIVER_PUBLIC_PROFILE_QUERY_KEY = "driver-public-profile";

export function useDriverPublicProfile(driverId: string | null) {
  return useQuery<DriverPublicProfileResponse>({
    queryKey: [DRIVER_PUBLIC_PROFILE_QUERY_KEY, driverId],
    queryFn: () => getDriverPublicProfile(driverId!),
    enabled: !!driverId,
    retry: false,
  });
}
