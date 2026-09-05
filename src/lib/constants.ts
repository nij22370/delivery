import { DRIVER_VEHICLE_TYPE } from "@/types/driverProfile/driverProfile";
import type { DriverVehicleType } from "@/types/driverProfile/driverProfile";

export const VEHICLE_ICONS: Record<DriverVehicleType, string> = {
  [DRIVER_VEHICLE_TYPE.BIKE]: "pedal_bike",
  [DRIVER_VEHICLE_TYPE.CAR]: "directions_car",
  [DRIVER_VEHICLE_TYPE.VAN]: "local_shipping",
  [DRIVER_VEHICLE_TYPE.TRUCK]: "fire_truck",
};

export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_DEBOUNCE_MS = 300;
export const PLATFORM_FEE_RATE = 0.10; // 10% platform fee
export const DRIVER_PAYOUT_RATE = 1 - PLATFORM_FEE_RATE; // 90% driver payout
export const STATUS_PAGE_URL = "https://status.swiftship.com";

export const NEPAL_POPULAR_CITIES = [
  "Kathmandu",
  "Pokhara",
  "Lalitpur",
  "Bhaktapur",
  "Biratnagar",
  "Birgunj",
  "Dharan",
  "Bharatpur",
  "Butwal",
  "Hetauda",
] as const;

export const NEPAL_OPERATING_ZONES = [
  "Kathmandu Valley",
  "Pokhara Valley",
  "Eastern Terai",
  "Western Terai",
  "Central Terai",
] as const;
