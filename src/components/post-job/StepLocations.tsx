"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobLocationSchema } from "@/types/job";
import type { JobLocationInput } from "@/types/job";
import FormFieldError from "@/components/post-job/FormFieldError";
import Link from "next/link";

interface StepLocationsProps {
  onNext: (data: JobLocationInput) => void;
  onAddressChange: (pickup: string, dropoff: string) => void;
}

const INPUT_CLASS =
  "w-full h-12 px-4 rounded-lg border border-outline-variant text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all bg-surface-white";

export default function StepLocations({
  onNext,
  onAddressChange,
}: StepLocationsProps) {
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