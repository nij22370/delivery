"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobVehicleSchema, JOB_VEHICLE_TYPE } from "@/types/job";
import type { JobVehicleInput, JobVehicleType } from "@/types/job";
import VehicleCard from "@/components/post-job/VehicleCard";
import FormFieldError from "@/components/post-job/FormFieldError";

const INPUT_CLASS =
  "w-full h-12 px-4 rounded-lg border border-outline-variant text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all bg-surface-white";

interface StepVehicleProps {
  onNext: (data: JobVehicleInput) => void;
  onBack: () => void;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    value: JOB_VEHICLE_TYPE.BICYCLE,
    label: "Bicycle / Scooter",
    icon: "pedal_bike",
    description:
      "Ideal for small documents, letters, or single small packages. Fastest for dense urban areas.",
    maxWeight: "Max 5 kg",
  },
  {
    value: JOB_VEHICLE_TYPE.CAR,
    label: "Standard Sedan",
    icon: "directions_car",
    description:
      "Suitable for multiple small boxes, grocery bags, or medium-sized electronics.",
    maxWeight: "Max 50 kg",
  },
  {
    value: JOB_VEHICLE_TYPE.VAN,
    label: "Cargo Van",
    icon: "local_shipping",
    description:
      "Perfect for moving small furniture, large appliance boxes, or multiple heavy items.",
    maxWeight: "Max 500 kg",
  },
  {
    value: JOB_VEHICLE_TYPE.TRUCK,
    label: "Box Truck",
    icon: "rv_hookup",
    description:
      "For commercial freight, pallets, or full apartment moves. Loading dock capable.",
    maxWeight: "Max 2000 kg",
  },
];

interface VehicleOption {
  value: JobVehicleType;
  label: string;
  icon: string;
  description: string;
  maxWeight: string;
}

export default function StepVehicle({ onNext, onBack }: StepVehicleProps) {
  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<JobVehicleInput>({
    resolver: zodResolver(jobVehicleSchema),
  });

  const selectedVehicle = watch("vehicleType");

  const handleSelectVehicle = useCallback(
    (vehicleType: JobVehicleType) => {
      setValue("vehicleType", vehicleType, { shouldValidate: true });
    },
    [setValue]
  );

  const handleFormSubmit = useCallback(
    (data: JobVehicleInput) => {
      onNext(data);
    },
    [onNext]
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-on-surface mb-1">Vehicle Selection</h2>
        <p className="text-sm text-on-surface-variant">
          Choose the required vehicle type based on your parcel&apos;s size and weight.
        </p>
      </div>

      {/* 2×2 vehicle grid — matches Stitch Step 2 layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {VEHICLE_OPTIONS.map((option) => (
          <VehicleCard
            key={option.value}
            option={option}
            isSelected={selectedVehicle === option.value}
            onSelect={handleSelectVehicle}
          />
        ))}
      </div>

      {errors.vehicleType && (
        <p className="text-sm text-error-red">{errors.vehicleType.message}</p>
      )}

      {/* Action buttons — Back left, Next right (mobile stacks, reversed) */}
      <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4 pt-6 border-t border-outline-variant/50">
        <button
          type="button"
          onClick={onBack}
          className="w-full md:w-auto px-6 py-3 border border-outline-variant text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          Back
        </button>
        <button
          type="submit"
          className="w-full md:w-auto px-8 py-3 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          Next Step
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </form>
  );
}