"use client";

import { useCallback, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  jobLocationSchema,
  jobVehicleSchema,
  JOB_VEHICLE_TYPE,
  type JobLocationInput,
  type JobVehicleInput,
  type JobVehicleType,
} from "@/types/job";
import dynamic from "next/dynamic";
const MapPreview = dynamic(() => import("@/components/MapPreview"), { ssr: false });

// ── Constants ────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 4;
const STEP_LOCATION = 1;
const STEP_VEHICLE = 2;

// Matches register/page.tsx input styling exactly
const INPUT_CLASS =
  "w-full h-12 px-4 rounded-lg border border-outline-variant text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all bg-surface-white";

// Vehicle options match the Stitch Step 2 screenshot exactly (4 cards, left-to-right, top-to-bottom)
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

// ── Types ────────────────────────────────────────────────────────────────────
interface VehicleOption {
  value: JobVehicleType;
  label: string;
  icon: string;
  description: string;
  maxWeight: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getStepLabel(step: number): string {
  const labels: Record<number, string> = {
    1: "Pickup & Dropoff details",
    2: "Vehicle Selection",
    3: "Pricing & Schedule",
    4: "Review & Submit",
  };
  return labels[step] ?? "";
}

function buildVehicleCardClassName(isSelected: boolean): string {
  const base =
    "border rounded-xl p-6 cursor-pointer flex flex-col h-full transition-all duration-200 bg-surface-white";
  return isSelected
    ? `${base} border-primary bg-[#dae2ff]/20 shadow-sm`
    : `${base} border-outline-variant hover:-translate-y-0.5 hover:shadow-sm`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function FormFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-error-red mt-1">{message}</p>;
}

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-on-surface-variant">
        Step {currentStep} of {TOTAL_STEPS}: {getStepLabel(currentStep)}
      </p>
      {/* 4-segment progress bar matching Stitch Step 1 design */}
      <div className="flex items-center w-full gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, segmentIndex) => (
          <div
            key={segmentIndex}
            className={[
              "h-2 flex-grow rounded-full transition-all",
              segmentIndex < currentStep ? "bg-primary" : "bg-surface-variant",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

function VehicleCard({
  option,
  isSelected,
  onSelect,
}: {
  option: VehicleOption;
  isSelected: boolean;
  onSelect: (value: JobVehicleType) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(option.value);
  }, [option.value, onSelect]);

  return (
    <div className={buildVehicleCardClassName(isSelected)} onClick={handleClick}>
      <div className="flex justify-between items-start mb-4">
        <div
          className={[
            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
            isSelected
              ? "bg-primary-fixed text-primary"
              : "bg-surface-container text-on-surface-variant",
          ].join(" ")}
        >
          <span
            className="material-symbols-outlined text-2xl"
            style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
          >
            {option.icon}
          </span>
        </div>
        <div
          className={[
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
            isSelected ? "border-primary" : "border-outline-variant",
          ].join(" ")}
        >
          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
        </div>
      </div>
      <h3 className="text-base font-semibold text-on-surface mb-1">{option.label}</h3>
      <p className="text-sm text-on-surface-variant mb-4 flex-grow leading-relaxed">
        {option.description}
      </p>
      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-lg w-fit">
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
          weight
        </span>
        <span>{option.maxWeight}</span>
      </div>
    </div>
  );
}

// ── Step 1: Locations ─────────────────────────────────────────────────────────
// Fields per Stitch Step 1 screenshot (exact match, no omissions):
//   Pickup:  Pickup Address, Contact Name, Phone Number, Special Instructions (optional)
//   Dropoff: Dropoff Address, Contact Name, Phone Number
function StepLocations({
  onNext,
  onAddressChange,
}: {
  onNext: (data: JobLocationInput) => void;
  onAddressChange: (pickup: string, dropoff: string) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<JobLocationInput>({
    resolver: zodResolver(jobLocationSchema),
  });

  const pickup = watch("pickupAddress");
  const dropoff = watch("dropoffAddress");

  useEffect(() => {
    onAddressChange(pickup || "", dropoff || "");
  }, [pickup, dropoff, onAddressChange]);

  const handleFormSubmit = useCallback(
    (data: JobLocationInput) => {
      onNext(data);
    },
    [onNext]
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6">

      {/* ── Pickup Details ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">location_on</span>
          <h2 className="text-xl font-semibold text-on-surface">Pickup Details</h2>
        </div>

        {/* Pickup Address */}
        <div className="space-y-1.5">
          <label
            htmlFor="post-job-pickup-address"
            className="text-sm font-medium text-on-surface-variant block"
          >
            Pickup Address
          </label>
          <input
            {...register("pickupAddress")}
            type="text"
            id="post-job-pickup-address"
            placeholder="Enter full pickup address"
            className={INPUT_CLASS}
          />
          <FormFieldError message={errors.pickupAddress?.message} />
        </div>

        {/* Contact Name + Phone Number — 2-col grid matching Stitch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="post-job-pickup-contact"
              className="text-sm font-medium text-on-surface-variant block"
            >
              Contact Name
            </label>
            <input
              {...register("pickupContactName")}
              type="text"
              id="post-job-pickup-contact"
              placeholder="Name"
              className={INPUT_CLASS}
            />
            <FormFieldError message={errors.pickupContactName?.message} />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="post-job-pickup-phone"
              className="text-sm font-medium text-on-surface-variant block"
            >
              Phone Number
            </label>
            <input
              {...register("pickupPhone")}
              type="tel"
              id="post-job-pickup-phone"
              placeholder="Phone"
              className={INPUT_CLASS}
            />
            <FormFieldError message={errors.pickupPhone?.message} />
          </div>
        </div>

        {/* Special Instructions — pickup only, optional */}
        <div className="space-y-1.5">
          <label
            htmlFor="post-job-pickup-instructions"
            className="text-sm font-medium text-on-surface-variant block"
          >
            Special Instructions (Optional)
          </label>
          <textarea
            {...register("pickupInstructions")}
            id="post-job-pickup-instructions"
            placeholder="e.g. Leave at front desk"
            rows={2}
            className="w-full border border-outline-variant rounded-lg p-4 text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all bg-surface-white resize-none"
          />
          <FormFieldError message={errors.pickupInstructions?.message} />
        </div>
      </div>

      <div className="w-full h-px bg-surface-container-low my-2" />

      {/* ── Dropoff Details ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant">flag</span>
          <h2 className="text-xl font-semibold text-on-surface">Dropoff Details</h2>
        </div>

        {/* Dropoff Address */}
        <div className="space-y-1.5">
          <label
            htmlFor="post-job-dropoff-address"
            className="text-sm font-medium text-on-surface-variant block"
          >
            Dropoff Address
          </label>
          <input
            {...register("dropoffAddress")}
            type="text"
            id="post-job-dropoff-address"
            placeholder="Enter full dropoff address"
            className={INPUT_CLASS}
          />
          <FormFieldError message={errors.dropoffAddress?.message} />
        </div>

        {/* Contact Name + Phone Number — 2-col grid matching Stitch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="post-job-dropoff-contact"
              className="text-sm font-medium text-on-surface-variant block"
            >
              Contact Name
            </label>
            <input
              {...register("dropoffContactName")}
              type="text"
              id="post-job-dropoff-contact"
              placeholder="Name"
              className={INPUT_CLASS}
            />
            <FormFieldError message={errors.dropoffContactName?.message} />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="post-job-dropoff-phone"
              className="text-sm font-medium text-on-surface-variant block"
            >
              Phone Number
            </label>
            <input
              {...register("dropoffPhone")}
              type="tel"
              id="post-job-dropoff-phone"
              placeholder="Phone"
              className={INPUT_CLASS}
            />
            <FormFieldError message={errors.dropoffPhone?.message} />
          </div>
        </div>
      </div>

      {/* ── Action Buttons ─────────────────────────────────────────────── */}
      <div className="flex justify-between items-center pt-4 border-t border-outline-variant/50">
        <Link
          href="/"
          className="px-6 py-3 border border-outline-variant text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="px-8 py-3 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
        >
          Next Step
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </form>
  );
}

// ── Step 2: Vehicle Selection ─────────────────────────────────────────────────
// 4-card grid matching Stitch Step 2 screenshot exactly.
function StepVehicle({
  onNext,
  onBack,
}: {
  onNext: (data: JobVehicleInput) => void;
  onBack: () => void;
}) {
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

// ── Page Component ────────────────────────────────────────────────────────────
export default function PostJobPage() {
  const [currentStep, setCurrentStep] = useState(STEP_LOCATION);
  const [locationData, setLocationData] = useState<JobLocationInput | null>(null);

  // Live map preview state for Step 1
  const [previewPickup, setPreviewPickup] = useState("");
  const [previewDropoff, setPreviewDropoff] = useState("");

  const handleAddressChange = useCallback((pickup: string, dropoff: string) => {
    setPreviewPickup(pickup);
    setPreviewDropoff(dropoff);
  }, []);

  const handleLocationNext = useCallback((data: JobLocationInput) => {
    setLocationData(data);
    setCurrentStep(STEP_VEHICLE);
  }, []);

  const handleVehicleNext = useCallback((_data: JobVehicleInput) => {
    // Step 3 (Pricing & Schedule) built on Day 16.
    // locationData + _data will be merged with price fields before final submission.
    setCurrentStep(3);
  }, []);

  const handleStepBack = useCallback(() => {
    setCurrentStep((previous) => Math.max(STEP_LOCATION, previous - 1));
  }, []);

  return (
    <div className="min-h-screen bg-surface-container-low text-on-surface">
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col lg:flex-row gap-8">

        {/* ── Form Area (lg:w-2/3 matching Stitch layout) ──────────────── */}
        <div className="flex-grow flex flex-col gap-6 w-full lg:w-2/3">

          {/* Page title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
              Post a Delivery
            </h1>
            <ProgressBar currentStep={currentStep} />
          </div>

          {/* Form card */}
          <div className="bg-surface-white border border-secondary-container rounded-xl p-4 md:p-6">
            {currentStep === STEP_LOCATION && (
              <StepLocations onNext={handleLocationNext} onAddressChange={handleAddressChange} />
            )}
            {currentStep === STEP_VEHICLE && (
              <StepVehicle onNext={handleVehicleNext} onBack={handleStepBack} />
            )}
            {currentStep === 3 && (
              <div className="py-12 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl text-primary mb-4 block">
                  schedule
                </span>
                <p className="text-base font-medium">
                  Step 3 (Pricing &amp; Schedule) coming on Day 16.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar (lg:w-1/3 matching Stitch layout) ──────────── */}
        <aside className="w-full lg:w-1/3 flex flex-col gap-6">

          {/* Map Preview placeholder — matches Stitch Step 1 right panel */}
          <div className="bg-surface-white border border-secondary-container rounded-xl overflow-hidden h-64 md:h-72 relative">
            <span className="absolute top-3 left-3 z-20 bg-surface-white text-on-surface text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-secondary-container">
              Map Preview
            </span>
            <MapPreview
              pickupAddress={currentStep === STEP_LOCATION ? previewPickup : locationData?.pickupAddress || ""}
              dropoffAddress={currentStep === STEP_LOCATION ? previewDropoff : locationData?.dropoffAddress || ""}
            />
          </div>

          {/* "Why accurate details matter" info card — matches Stitch exactly */}
          <div className="bg-surface-white border border-secondary-container rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-base font-semibold text-on-surface">
              Why accurate details matter
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Providing exact pickup and dropoff locations, along with clear contact
              information, ensures our couriers can complete your delivery swiftly and
              without delays.
            </p>
            <ul className="text-sm text-on-surface-variant list-disc pl-5 flex flex-col gap-1">
              <li>Double-check unit numbers.</li>
              <li>Add gate codes if applicable.</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
