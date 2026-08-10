import api from "../../api";
import type { DriverPublicProfileResponse } from "@/types/drivers/driverPublicProfile";

const DRIVERS_ENDPOINT = "/drivers";

export async function getDriverPublicProfile(
  driverId: string
): Promise<DriverPublicProfileResponse> {
  const response = await api.get<DriverPublicProfileResponse>(
    `${DRIVERS_ENDPOINT}/${driverId}`
  );
  return response.data;
}
