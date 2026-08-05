"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobPricingSchema } from "@/types/job";
import type { JobPricingInput } from "@/types/job";
import FormFieldError from "@/components/post-job/FormFieldError";
import { calculateSuggestedPrice } from "@/lib/pricing";

const INPUT_CLASS =
  "w-full h-12 px-4 rounded-lg border border-outline-variant text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all bg-surface-white";

const TIME_WINDOW_OPTIONS = [
  "Morning (8am - 12pm)",
  "Afternoon (12pm - 4pm)",
  "Evening (4pm - 8pm)",
  "Flexible",
] as const;

interface StepPricingProps {
  onNext: (data: JobPricingInput) => void;
  onBack: () => void;
  locationData: {
    pickupAddress: string;
    dropoffAddress: string;
  } | null;
}

export default function StepPricing({ onNext, onBack, locationData }: StepPricingProps) {
  const [suggestedPriceCents, setSuggestedPriceCents] = useState<number | undefined>();
  const [distanceMiles, setDistanceMiles] = useState<number | undefined>();
  const [isCalculating, setIsCalculating] = useState(false);

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<JobPricingInput>({
    resolver: zodResolver(jobPricingSchema),
  });

  useEffect(() => {
    if (!locationData?.pickupAddress || !locationData?.dropoffAddress) return;

    setIsCalculating(true);

    calculateSuggestedPrice(locationData.pickupAddress, locationData.dropoffAddress).then(
      (result) => {
        if (result) {
          setSuggestedPriceCents(result.suggestedPriceCents);
          setDistanceMiles(result.distanceMiles);
          setValue("offeredPrice", result.suggestedPriceCents, { shouldValidate: false });
        }
        setIsCalculating(false);
      }
    );
  }, [locationData, setValue]);

  const handleFormSubmit = useCallback(
    (data: JobPricingInput) => {
      onNext(data);
    },
    [onNext]
  );

  const suggestedPriceLabel = isCalculating
    ? "Calculating suggested price..."
    : suggestedPriceCents
      ? `Suggested price: $${(suggestedPriceCents / 100).toFixed(2)}`
      : "Could not calculate a price suggestion";

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-semibold text-on-surface mb-6">Pricing & Schedule</h2>

        {/* Pricing Details */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-on-surface mb-4">Pricing Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Suggested Price Box */}
            <div className="bg-surface-container-low p-6 rounded-lg flex flex-col items-center justify-center text-center min-h-[120px]">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Suggested Price
              </span>
              <div className="text-4xl font-bold text-primary mb-2">
                {isCalculating ? (
                  <span className="text-xl animate-pulse">Calculating...</span>
                ) : suggestedPriceCents ? (
                  `$${(suggestedPriceCents / 100).toFixed(2)}`
                ) : (
                  <span className="text-xl text-on-surface-variant">N/A</span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                {distanceMiles !== undefined
                  ? `Based on ${distanceMiles} miles and standard van requirement.`
                  : suggestedPriceLabel}
              </p>
            </div>

            {/* Agreed Price Input */}
            <div className="flex flex-col justify-center gap-2">
              <label
                htmlFor="post-job-offered-price"
                className="text-sm font-medium text-on-surface-variant block"
              >
                Your Offer (Agreed Price) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium select-none">
                  $
                </span>
                <input
                  {...register("offeredPrice", { valueAsNumber: true })}
                  type="number"
                  id="post-job-offered-price"
                  placeholder="45.00"
                  min="1"
                  step="1"
                  className={`${INPUT_CLASS} pl-8`}
                />
              </div>
              <p className="text-xs text-on-surface-variant">
                Enter the amount in cents (e.g. 4500 = $45.00). Couriers are more likely to
                accept offers at or above the suggested price.
              </p>
              <FormFieldError message={errors.offeredPrice?.message} />
            </div>
          </div>
        </div>

        {/* Pickup Window */}
        <div>
          <h3 className="text-lg font-medium text-on-surface mb-4">Pickup Window</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label
                htmlFor="post-job-pickup-date"
                className="text-sm font-medium text-on-surface-variant block mb-2"
              >
                Date *
              </label>
              <input
                {...register("pickupDate")}
                type="date"
                id="post-job-pickup-date"
                className={INPUT_CLASS}
              />
              <FormFieldError message={errors.pickupDate?.message} />
            </div>

            {/* Time Window */}
            <div>
              <label
                htmlFor="post-job-time-window"
                className="text-sm font-medium text-on-surface-variant block mb-2"
              >
                Time Window *
              </label>
              <div className="relative">
                <select
                  {...register("pickupTimeWindow")}
                  id="post-job-time-window"
                  className={`${INPUT_CLASS} appearance-none pr-10`}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a time window
                  </option>
                  {TIME_WINDOW_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant pointer-events-none">
                  expand_more
                </span>
              </div>
              <FormFieldError message={errors.pickupTimeWindow?.message} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-outline-variant/50">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-outline-variant text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          Back
        </button>
        <button
          type="submit"
          disabled={isCalculating}
          className="px-8 py-3 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Continue to Review
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </form>
  );
}