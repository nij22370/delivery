// driversApi.ts - Plain async functions for driver verification domain (no React/TanStack imports)
import api from "../../api";
import type {
  DriverProfileUpdateInput,
  GetDriverVerificationResponse,
  UpdateDriverVerificationResponse,
} from "@/types/driverProfile/driverProfile";

const DRIVER_VERIFICATION_ENDPOINT = "/drivers/verification";

export async function getDriverVerification(): Promise<GetDriverVerificationResponse> {
  const response = await api.get<GetDriverVerificationResponse>(DRIVER_VERIFICATION_ENDPOINT);
  return response.data;
}

export async function updateDriverVerification(data: DriverProfileUpdateInput): Promise<UpdateDriverVerificationResponse> {
  const response = await api.put<UpdateDriverVerificationResponse>(DRIVER_VERIFICATION_ENDPOINT, data);
  return response.data;
}
