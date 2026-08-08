import { DRIVER_VEHICLE_TYPE } from "@/types/driverProfile/driverProfile";
import type { DriverVehicleType } from "@/types/driverProfile/driverProfile";

export const VEHICLE_ICONS: Record<DriverVehicleType, string> = {
  [DRIVER_VEHICLE_TYPE.BIKE]: "pedal_bike",
  [DRIVER_VEHICLE_TYPE.CAR]: "directions_car",
  [DRIVER_VEHICLE_TYPE.VAN]: "local_shipping",
  [DRIVER_VEHICLE_TYPE.TRUCK]: "fire_truck",
};
