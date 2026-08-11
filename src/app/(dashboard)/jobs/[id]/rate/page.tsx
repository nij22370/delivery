"use client";

import { use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AxiosError } from "axios";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { apiFetch } from "@/utils/apiFetch";
import { useCheckRating, useSubmitRating } from "@/api/hooks/ratings/ratingsApi";
import { useDriverPublicProfile } from "@/api/hooks/drivers/driverPublicProfileApi";
import { getBackendErrorMessage } from "@/lib/errorResponse";
import { ratingSubmitSchema } from "@/types/rating";
import { JOB_STATUS } from "@/types/job";
import { getInitials, formatCompletedDate } from "@/utils/format";

// ── Constants ────────────────────────────────────────────────────────────────
const JOB_DETAIL_QUERY_KEY = "job-detail-for-rating";
const JOB_ENDPOINT_BASE = "/api/jobs";
const JOB_SHORT_ID_CHARS = 6;

const RATING_VALUES = [5, 4, 3, 2, 1] as const;

const FILLED_ICON_STYLE = { fontVariationSettings: "'FILL' 1" } as const;

// ── Types ────────────────────────────────────────────────────────────────────
interface JobDetail {
  _id: string;
  posterId: string;
  driverId: string | null;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  vehicleType: string;
  offeredPrice: number;
  pickupDate: string;
  pickupTimeWindow: string;
  updatedAt: string;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────
async function fetchJobForRating(jobId: string): Promise<JobDetail> {
  const response = await apiFetch(`${JOB_ENDPOINT_BASE}/${jobId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message ?? "Failed to load job.");
  }
  const data: { job: JobDetail } = await response.json();
  return data.job;
}

function getStarAriaLabel(value: number): string {
  return `${value} star${value > 1 ? "s" : ""}`;
}

function getSubmitButtonContent(isPending: boolean): ReactNode {
  if (isPending) {
    return (
      <>
        <span className="material-symbols-outlined text-xl animate-spin">
          progress_activity
        </span>
        Submitting...
      </>
    );
  }
  return "Submit Review";
}

// ── Sub-components ───────────────────────────────────────────────────────────
function StarButton({
  value,
  isActive,
  isChecked,
  onHover,
  onLeave,
  onSelect,
}: {
  value: number;
  isActive: boolean;
  isChecked: boolean;
  onHover: (value: number) => void;
  onLeave: () => void;
  onSelect: (value: number) => void;
}) {
  const handleHover = useCallback(() => onHover(value), [onHover, value]);
  const handleSelect = useCallback(() => onSelect(value), [onSelect, value]);

  const starClassName = [
    "material-symbols-outlined text-4xl transition-colors cursor-pointer h-12 w-12 flex items-center justify-center",
    isActive ? "text-warning-amber" : "text-secondary-fixed-dim",
  ].join(" ");

  return (
    <span
      role="radio"
      aria-checked={isChecked}
      aria-label={getStarAriaLabel(value)}
      className={starClassName}
      style={FILLED_ICON_STYLE}
      onMouseEnter={handleHover}
      onMouseLeave={onLeave}
      onClick={handleSelect}
    >
      star
    </span>
  );
}

export default function RateJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data: job,
    isLoading: isJobLoading,
    isError: isJobError,
    error: jobError,
  } = useQuery({
    queryKey: [JOB_DETAIL_QUERY_KEY, id],
    queryFn: () => fetchJobForRating(id),
    retry: false,
  });

  const { data: checkData, isLoading: isCheckLoading } = useCheckRating(id);
  const { data: driverProfileData } = useDriverPublicProfile(job?.driverId ?? null);
  const submitRating = useSubmitRating();

  const activeRating = useMemo(
    () => hoveredRating ?? selectedRating ?? 0,
    [hoveredRating, selectedRating]
  );

  const handleStarHover = useCallback((value: number) => {
    setHoveredRating(value);
  }, []);

  const handleStarLeave = useCallback(() => {
    setHoveredRating(null);
  }, []);

  const handleStarClick = useCallback((value: number) => {
    setSelectedRating(value);
  }, []);

  const handleCommentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setComment(event.target.value);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (!selectedRating || !job || !user) return;
    setSubmitError(null);

    const toUserId = job.posterId === user._id ? job.driverId : job.posterId;
    if (!toUserId) return;

    const payload = {
      jobId: id,
      toUserId,
      score: selectedRating,
      comment: comment.trim() || undefined,
    };

    const validation = ratingSubmitSchema.safeParse(payload);
    if (!validation.success) {
      setSubmitError("Please provide a rating before submitting.");
      return;
    }

    submitRating.mutate(validation.data, {
      onSuccess: () => {
        router.push(`/jobs/${id}`);
      },
      onError: (error: AxiosError) => {
        const message = getBackendErrorMessage(error, "Failed to submit review");
        setSubmitError(message);
      },
    });
  }, [selectedRating, job, user, id, comment, submitRating, router]);

  const handleSkip = useCallback(() => {
    router.push(`/jobs/${id}`);
  }, [router, id]);

  const starButtons = useMemo(
    () =>
      RATING_VALUES.map((value) => (
        <StarButton
          key={value}
          value={value}
          isActive={value <= activeRating}
          isChecked={selectedRating === value}
          onHover={handleStarHover}
          onLeave={handleStarLeave}
          onSelect={handleStarClick}
        />
      )),
    [activeRating, selectedRating, handleStarHover, handleStarLeave, handleStarClick]
  );

  if (isAuthLoading || isJobLoading || isCheckLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (isJobError || !job) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-5xl text-error-red mb-4 block">
            error_outline
          </span>
          <h1 className="text-xl font-semibold text-on-surface mb-2">Job Not Found</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            {jobError instanceof Error ? jobError.message : "This job could not be loaded."}
          </p>
          <Link
            href="/jobs/browse"
            className="text-sm font-semibold text-primary hover:underline cursor-pointer"
          >
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  if (!user || user._id !== job.posterId) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-xl font-semibold text-on-surface mb-2">Not Authorized</h1>
          <p className="text-sm text-on-surface-variant">Only the poster can rate this delivery.</p>
          <Link
            href={`/jobs/${id}`}
            className="text-sm font-semibold text-primary hover:underline mt-4 block cursor-pointer"
          >
            ← Back to Job
          </Link>
        </div>
      </div>
    );
  }

  if (job.status !== JOB_STATUS.DELIVERED) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-xl font-semibold text-on-surface mb-2">Job Not Completed</h1>
          <p className="text-sm text-on-surface-variant">Ratings can only be submitted for delivered jobs.</p>
          <Link
            href={`/jobs/${id}`}
            className="text-sm font-semibold text-primary hover:underline mt-4 block cursor-pointer"
          >
            ← Back to Job
          </Link>
        </div>
      </div>
    );
  }

  if (checkData?.rated) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center px-4">
        <div className="w-full max-w-xl bg-surface-white border border-surface-variant rounded-xl p-6 md:p-8 flex flex-col gap-6 shadow-sm text-center">
          <span className="material-symbols-outlined text-6xl text-success-green block">
            check_circle
          </span>
          <h1 className="text-2xl font-semibold text-on-surface">Already submitted</h1>
          <p className="text-sm text-on-surface-variant">
            You have already rated this delivery. Thank you for your feedback!
          </p>
          <Link
            href={`/jobs/${id}`}
            className="w-full bg-primary-container text-on-primary-container rounded-lg h-12 flex items-center justify-center text-sm font-semibold hover:bg-surface-tint transition-colors cursor-pointer"
          >
            Back to Job Details
          </Link>
        </div>
      </div>
    );
  }

  const driverName = driverProfileData?.user?.name ?? "Your Driver";
  const jobShortId = `SF-${job._id.slice(-JOB_SHORT_ID_CHARS).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-xl bg-surface-white border border-surface-variant rounded-xl p-6 md:p-8 flex flex-col gap-8 shadow-sm">

        <header className="text-center flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold text-on-surface">
            How was your delivery?
          </h1>
          <p className="text-sm text-on-surface-variant">
            Your feedback helps us improve our service.
          </p>
        </header>

        <section className="flex flex-col items-center gap-4 py-4 border-y border-surface-container-low">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-surface-container-highest bg-primary-container/15 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {getInitials(driverName)}
            </span>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-on-surface">{driverName}</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Courier for Job #{jobShortId}
            </p>
          </div>
          <div
            className="flex flex-row-reverse justify-center gap-2 mt-2 cursor-pointer"
            onMouseLeave={handleStarLeave}
          >
            {starButtons}
          </div>
          <input
            type="hidden"
            name="rating"
            value={selectedRating ?? 0}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            Job Details
          </h3>
          <div className="bg-surface-container-low rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-0.5">
                location_on
              </span>
              <div>
                <p className="text-sm font-medium text-on-surface">Pickup</p>
                <p className="text-sm text-on-surface-variant">{job.pickupAddress}</p>
              </div>
            </div>
            <div className="h-px bg-surface-variant w-full my-1" />
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-0.5">
                flag
              </span>
              <div>
                <p className="text-sm font-medium text-on-surface">Dropoff</p>
                <p className="text-sm text-on-surface-variant">{job.dropoffAddress}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-surface-variant">
              <span className="text-xs text-on-surface-variant">
                Completed: {formatCompletedDate(job.updatedAt)}
              </span>
              <span className="text-xs px-2 py-1 bg-success-green/10 text-success-green rounded">
                Delivered
              </span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <label className="text-sm font-medium text-on-surface" htmlFor="review-text">
            Leave a review (optional)
          </label>
          <textarea
            id="review-text"
            className="w-full bg-surface-white border border-surface-variant rounded-lg p-4 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-all"
            placeholder={`How did ${driverName} do?`}
            rows={4}
            value={comment}
            onChange={handleCommentChange}
          />
        </section>

        {submitError && (
          <div className="p-3 text-sm text-error-red bg-error-container border border-error-red/40 rounded-lg">
            {submitError}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedRating || submitRating.isPending}
            className="w-full bg-primary-container text-on-primary-container text-sm font-semibold py-3 px-6 rounded-lg hover:bg-surface-tint transition-colors flex justify-center items-center gap-2 h-12 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {getSubmitButtonContent(submitRating.isPending)}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitRating.isPending}
            className="w-full bg-transparent border border-surface-variant text-on-surface text-sm font-semibold py-3 px-6 rounded-lg hover:bg-surface-container-low transition-colors h-12 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
