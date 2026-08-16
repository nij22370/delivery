"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { jobCreationSchema } from "@/types/job";
import type { JobCreationInput } from "@/types/job";

interface StepReviewProps {
  locationData: {
    pickupAddress: string;
    pickupContactName: string;
    pickupPhone: string;
    pickupInstructions?: string;
    dropoffAddress: string;
    dropoffContactName: string;
    dropoffPhone: string;
  } | null;
  vehicleData: {
    vehicleType: string;
  } | null;
  pricingData: {
    packageDescription?: string;
    offeredPrice: number;
    pickupDate: string;
    pickupTimeWindow: string;
  } | null;
  onSubmit: (data: JobCreationInput) => void;
  isSubmitting: boolean;
  submitError: string | null;
}

function buildValidationError(
  locationData: StepReviewProps["locationData"],
  vehicleData: StepReviewProps["vehicleData"],
  pricingData: StepReviewProps["pricingData"]
): string | null {
  const merged = {
    ...locationData,
    ...vehicleData,
    ...pricingData,
  } as JobCreationInput;

  const result = jobCreationSchema.safeParse(merged);
  if (!result.success) {
    return result.error.issues.map((issue) => issue.message).join(", ");
  }
  return null;
}

export default function StepReview({
  locationData,
  vehicleData,
  pricingData,
  onSubmit,
  isSubmitting,
  submitError,
}: StepReviewProps) {
  const router = useRouter();

  const handleFormSubmit = useCallback(() => {
    if (!locationData || !vehicleData || !pricingData) return;

    const merged = {
      ...locationData,
      ...vehicleData,
      ...pricingData,
    } as JobCreationInput;

    const result = jobCreationSchema.safeParse(merged);
    if (result.success) {
      onSubmit(result.data);
    }
  }, [locationData, vehicleData, pricingData, onSubmit]);

  if (!locationData || !vehicleData || !pricingData) {
    return (
      <div className="text-center py-8 text-on-surface-variant">
        <p className="mb-4">Missing information. Please complete all steps.</p>
        <button
          onClick={() => router.push("/post-job")}
          className="px-6 py-3 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const validationError = buildValidationError(locationData, vehicleData, pricingData);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-on-surface mb-1">Review & Submit</h2>
        <p className="text-sm text-on-surface-variant">
          Please verify all details before submitting your job.
        </p>
      </div>

      {(submitError || validationError) && (
        <div className="p-3 text-sm text-error-red bg-error-container border border-error-red/40 rounded-lg">
          {submitError ?? validationError}
        </div>
      )}

      <div className="space-y-4">
        {/* Pickup Details */}
        <div className="p-4 bg-surface-container-low rounded-lg">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
            Pickup Details
          </h3>
          <p className="text-sm font-medium text-on-surface">{locationData.pickupAddress}</p>
          <p className="text-sm text-on-surface-variant mt-1">
            Contact: {locationData.pickupContactName} · {locationData.pickupPhone}
          </p>
          {locationData.pickupInstructions && (
            <p className="text-sm text-on-surface-variant mt-1">
              Instructions: {locationData.pickupInstructions}
            </p>
          )}
        </div>

        {/* Dropoff Details */}
        <div className="p-4 bg-surface-container-low rounded-lg">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
            Dropoff Details
          </h3>
          <p className="text-sm font-medium text-on-surface">{locationData.dropoffAddress}</p>
          <p className="text-sm text-on-surface-variant mt-1">
            Contact: {locationData.dropoffContactName} · {locationData.dropoffPhone}
          </p>
        </div>

        {/* Vehicle & Pricing */}
        <div className="p-4 bg-surface-container-low rounded-lg">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
            Vehicle & Pricing
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-on-surface">
                Vehicle: <span className="capitalize font-medium">{vehicleData.vehicleType}</span>
              </p>
              <p className="text-sm text-on-surface mt-1">
                Agreed Price:{" "}
                <span className="font-semibold text-primary">
                  NPR {pricingData.offeredPrice.toLocaleString("en-NP")}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-on-surface">
                Date: <span className="font-medium">{pricingData.pickupDate}</span>
              </p>
              <p className="text-sm text-on-surface mt-1">
                Window: <span className="font-medium">{pricingData.pickupTimeWindow}</span>
              </p>
            </div>
          </div>
          {pricingData.packageDescription && (
            <p className="text-sm text-on-surface-variant mt-3 pt-3 border-t border-outline-variant/30">
              Notes: {pricingData.packageDescription}
            </p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleFormSubmit}
        disabled={isSubmitting || !!validationError}
        className="w-full px-6 py-3 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
            Submitting...
          </>
        ) : (
          "Create Job"
        )}
      </button>
    </div>
  );
}