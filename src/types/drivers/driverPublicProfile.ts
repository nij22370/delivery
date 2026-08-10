import type { DriverProfile } from "@/types/driverProfile/driverProfile";

export interface DriverPublicUser {
  _id: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface DriverPublicProfileResponse {
  user: DriverPublicUser;
  profile: DriverProfile | null;
}
