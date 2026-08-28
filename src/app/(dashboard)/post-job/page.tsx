"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { createJob } from "@/api/apis/jobs/jobApi";
import { getBackendErrorMessage } from "@/lib/errorResponse";
import { type JobCreationInput, type JobVehicleType } from "@/types/job";
import dynamic from "next/dynamic";
import ProgressBar from "@/components/post-job/ProgressBar";
import StepLocations from "@/components/post-job/StepLocations";
import StepVehicle from "@/components/post-job/StepVehicle";
import StepPricing from "@/components/post-job/StepPricing";
import StepReview from "@/components/post-job/StepReview";

// ── Constants ────────────────────────────────────────────────
const STEP_LOCATION = 1;
const STEP_VEHICLE = 2;
const STEP_PRICING = 3;
const STEP_REVIEW = 4;

const MapPreview = dynamic(() => import("@/components/MapPreview"), { ssr: false });

// ── Page Component ────────────────────────────────────────────
export default function PostJobPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(STEP_LOCATION);
  const [locationData, setLocationData] = useState<{
    pickupAddress: string;
    pickupContactName: string;
    pickupPhone: string;
    pickupInstructions?: string;
    dropoffAddress: string;
    dropoffContactName: string;
    dropoffPhone: string;
  } | null>(null);
  const [vehicleData, setVehicleData] = useState<{ vehicleType: JobVehicleType } | null>(null);
  const [pricingData, setPricingData] = useState<{
    packageDescription?: string;
    offeredPrice: number;
    pickupDate: string;
    pickupTimeWindow: string;
  } | null>(null);

  // Live map preview state for Step 1
  const [previewPickup, setPreviewPickup] = useState("");
  const [previewDropoff, setPreviewDropoff] = useState("");

  const handleAddressChange = useCallback((pickup: string, dropoff: string) => {
    setPreviewPickup(pickup);
    setPreviewDropoff(dropoff);
  }, []);

  const handleLocationNext = useCallback((data: {
    pickupAddress: string;
    pickupContactName: string;
    pickupPhone: string;
    pickupInstructions?: string;
    dropoffAddress: string;
    dropoffContactName: string;
    dropoffPhone: string;
  }) => {
    setLocationData(data);
    setCurrentStep(STEP_VEHICLE);
  }, []);

  const handleVehicleNext = useCallback((data: { vehicleType: JobVehicleType }) => {
    setVehicleData(data);
    setCurrentStep(STEP_PRICING);
  }, []);

  const handlePricingNext = useCallback((data: {
    packageDescription?: string;
    offeredPrice: number;
    pickupDate: string;
    pickupTimeWindow: string;
  }) => {
    setPricingData(data);
    setCurrentStep(STEP_REVIEW);
  }, []);

  const handleStepBack = useCallback(() => {
    setCurrentStep((previous) => Math.max(STEP_LOCATION, previous - 1));
  }, []);

  // Mutation for job creation — uses the axios `api` client so the automatic
  // 401 → token-refresh → retry interceptor applies when the access token expires.
  const createJobMutation = useMutation({
    mutationFn: (data: JobCreationInput) => createJob(data),
    onSuccess: (data) => {
      router.push(`/payment?jobId=${data.job._id}`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof AxiosError
          ? getBackendErrorMessage(error, "Failed to create job")
          : error instanceof Error
            ? error.message
            : "An unexpected error occurred.";
      console.error("Job creation error:", message);
    },
  });

  const handleSubmit = useCallback(
    (data: JobCreationInput) => {
      createJobMutation.mutate(data);
    },
    [createJobMutation]
  );

  const submitErrorMessage =
    createJobMutation.error instanceof AxiosError
      ? createJobMutation.error.response?.status === 401
        ? "Your session has expired. Please log in and try again."
        : getBackendErrorMessage(createJobMutation.error, "Failed to create job")
      : createJobMutation.error instanceof Error
        ? createJobMutation.error.message
        : createJobMutation.isError
          ? "An unexpected error occurred."
          : null;

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
              <StepLocations
                onNext={handleLocationNext}
                onAddressChange={handleAddressChange}
              />
            )}
            {currentStep === STEP_VEHICLE && (
              <StepVehicle
                onNext={handleVehicleNext}
                onBack={handleStepBack}
              />
            )}
            {currentStep === STEP_PRICING && (
              <StepPricing
                onNext={handlePricingNext}
                onBack={handleStepBack}
                locationData={locationData}
                vehicleType={vehicleData?.vehicleType ?? null}
              />
            )}
            {currentStep === STEP_REVIEW && (
              <StepReview
                locationData={locationData}
                vehicleData={vehicleData}
                pricingData={pricingData}
                onSubmit={handleSubmit}
                isSubmitting={createJobMutation.isPending}
                submitError={submitErrorMessage}
              />
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
              pickupAddress={
                currentStep === STEP_LOCATION
                  ? previewPickup
                  : locationData?.pickupAddress ?? ""
              }
              dropoffAddress={
                currentStep === STEP_LOCATION
                  ? previewDropoff
                  : locationData?.dropoffAddress ?? ""
              }
            />
          </div>

          {/* "Why accurate details matter" info card — matches Stitch exactly */}
          <div className="bg-surface-white border border-secondary-container rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-base font-semibold text-on-surface">
              Why accurate details matter
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Providing exact pickup and dropoff locations, along with clear
              contact information, ensures our couriers can complete your delivery swiftly and
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