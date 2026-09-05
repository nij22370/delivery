"use client";

import { use, useEffect, useMemo } from "react";
import type { ReactElement } from "react";
import Link from "next/link";
import { useDriverPublicProfile } from "@/api/hooks/drivers/driverPublicProfileApi";
import { useDriverReviews } from "@/api/hooks/ratings/ratingsApi";
import { VEHICLE_ICONS } from "@/lib/constants";
import { getInitials, formatAppliedDate } from "@/utils/format";
import { DRIVER_PROFILE_STATUS } from "@/types/driverProfile/driverProfile";
import type { DriverVehicleType } from "@/types/driverProfile/driverProfile";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

// ── Constants ────────────────────────────────────────────────────────────────
const SHORT_ID_CHARS = 4;
const REVIEW_SKELETON_ROWS = 3;
const STAR_COUNT = 5;
const POSTER_ROLE = "poster";
const DASHBOARD_PATH = "/dashboard";

const FILLED_ICON_STYLE = { fontVariationSettings: "'FILL' 1" } as const;

const VEHICLE_LABELS: Record<DriverVehicleType, string> = {
  bike: "Bike",
  car: "Sedan",
  van: "Cargo Van",
  truck: "Box Truck",
};

// ── Pure helpers ─────────────────────────────────────────────────────────────
function buildStars(count: number, filled: boolean, size: string): ReactElement[] {
  const elements: ReactElement[] = [];
  for (let index = 0; index < count; index += 1) {
    const style = filled ? FILLED_ICON_STYLE : undefined;
    elements.push(
      <span
        key={`${filled ? "filled" : "empty"}-${index}`}
        className={`material-symbols-outlined ${size}`}
        style={style}
      >
        star
      </span>
    );
  }
  return elements;
}

function buildSkeletonRows(count: number): ReactElement[] {
  const elements: ReactElement[] = [];
  for (let index = 0; index < count; index += 1) {
    elements.push(
      <div key={index} className="animate-pulse flex gap-3">
        <div className="w-10 h-10 bg-surface-container-high rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-surface-container-high rounded w-1/3" />
          <div className="h-3 bg-surface-container-high rounded w-1/4" />
          <div className="h-4 bg-surface-container-high rounded w-full" />
        </div>
      </div>
    );
  }
  return elements;
}

// ── Sub-components ───────────────────────────────────────────────────────────
function StarRating({ score, size = "text-[18px]" }: { score: number; size?: string }) {
  const { fullStars, hasHalf, emptyStars } = useMemo(() => {
    const fullStars = Math.floor(score);
    const hasHalf = score % 1 >= 0.5;
    const emptyStars = STAR_COUNT - fullStars - (hasHalf ? 1 : 0);
    return { fullStars, hasHalf, emptyStars };
  }, [score]);

  return (
    <div className="flex text-warning-amber">
      {buildStars(fullStars, true, size)}
      {hasHalf && (
        <span className={`material-symbols-outlined ${size}`}>star_half</span>
      )}
      {buildStars(emptyStars, false, size)}
    </div>
  );
}

function ReviewItem({
  reviewerName,
  score,
  comment,
  createdAt,
  index,
}: {
  reviewerName: string;
  score: number;
  comment?: string | null;
  createdAt: string;
  index: number;
}) {
  const initials = getInitials(reviewerName);
  const avatarClassName = [
    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
    index % 2 === 0
      ? "bg-tertiary-fixed text-on-tertiary-fixed"
      : "bg-secondary-fixed text-on-secondary-fixed",
  ].join(" ");

  return (
    <div className="pb-6 border-b border-secondary-container last:border-b-0 last:pb-0">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <div className={avatarClassName}>
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface">{reviewerName}</p>
            <p className="text-xs text-on-surface-variant">
              {formatAppliedDate(createdAt)}
            </p>
          </div>
        </div>
        <StarRating score={score} />
      </div>
      {comment && (
        <p className="text-sm text-on-surface-variant mt-1">{comment}</p>
      )}
    </div>
  );
}

function ReviewListSkeleton() {
  const rows = useMemo(() => buildSkeletonRows(REVIEW_SKELETON_ROWS), []);
  return <div className="flex flex-col gap-4">{rows}</div>;
}

export default function DriverProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  useEffect(() => {
    if (!isAuthLoading && user?.role === POSTER_ROLE) {
      router.replace(DASHBOARD_PATH);
    }
  }, [isAuthLoading, user, router]);

  const isDriver = !isAuthLoading && user?.role !== POSTER_ROLE;

  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useDriverPublicProfile(isDriver ? id : null);

  const {
    data: reviewsData,
    isLoading: isReviewsLoading,
  } = useDriverReviews(isDriver ? id : null);

  const memberSince = useMemo(() => {
    const createdAt = profileData?.user?.createdAt;
    if (!createdAt) return "";
    const date = new Date(createdAt);
    return date.toLocaleDateString("en-US", { year: "numeric" });
  }, [profileData]);

  const shortId = useMemo(() => `DRV-${id.slice(-SHORT_ID_CHARS).toUpperCase()}`, [id]);

  const reviewItems = useMemo(() => {
    const reviews = reviewsData?.reviews ?? [];
    return reviews.map((review, index) => (
      <ReviewItem
        key={review._id}
        reviewerName={review.fromUserId?.name ?? "Anonymous"}
        score={review.score}
        comment={review.comment}
        createdAt={review.createdAt}
        index={index}
      />
    ));
  }, [reviewsData]);

  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (isProfileError || !profileData?.user) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-5xl text-error-red mb-4 block">
            error_outline
          </span>
          <h1 className="text-xl font-semibold text-on-surface mb-2">Driver Not Found</h1>
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

  const { user: driverUser, profile, totalDeliveries } = profileData;
  const reviews = reviewsData?.reviews ?? [];
  const driverName = driverUser.name;
  const ratingAvg = profile?.ratingAvg ?? 0;
  const ratingCount = profile?.ratingCount ?? 0;
  const vehicleType = profile?.vehicleType as DriverVehicleType | undefined;
  const isVerified = profile?.status === DRIVER_PROFILE_STATUS.APPROVED;

  let reviewsContent: ReactElement;
  if (isReviewsLoading) {
    reviewsContent = <ReviewListSkeleton />;
  } else if (reviews.length === 0) {
    reviewsContent = (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">
          rate_review
        </span>
        <p className="text-sm text-on-surface-variant">No reviews yet</p>
      </div>
    );
  } else {
    reviewsContent = <div className="flex flex-col gap-6">{reviewItems}</div>;
  }

  return (
    <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/jobs/browse"
            className="w-12 h-12 flex items-center justify-center border border-secondary-container rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Driver Profile</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 md:col-span-4 bg-surface-white border border-secondary-container rounded-xl p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-surface-container-high -z-0" />
            <div className="relative z-10 mt-6 mb-4">
              <div className="w-24 h-24 rounded-full border-4 border-surface-white bg-primary-container/15 flex items-center justify-center shadow-sm">
                <span className="text-3xl font-bold text-primary">
                  {getInitials(driverName)}
                </span>
              </div>
              {isVerified && (
                <div className="absolute bottom-0 right-0 bg-success-green text-surface-white p-1 rounded-full border-2 border-surface-white flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={FILLED_ICON_STYLE}
                  >
                    verified
                  </span>
                </div>
              )}
            </div>
            <h2 className="text-lg font-semibold text-on-surface mb-1">{driverName}</h2>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-on-surface-variant">ID: {shortId}</span>
              <span className="w-1 h-1 bg-secondary rounded-full" />
              <span className="text-sm text-on-surface-variant">
                Member since {memberSince}
              </span>
            </div>
            {vehicleType && (
              <div className="flex gap-2 mb-6">
                <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">
                    {VEHICLE_ICONS[vehicleType]}
                  </span>
                  {VEHICLE_LABELS[vehicleType]}
                </span>
              </div>
            )}
            <div className="w-full h-[1px] bg-secondary-container mb-6" />
            <div className="grid grid-cols-2 gap-4 w-full text-left">
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Total Deliveries</p>
                <p className="text-lg font-semibold text-on-surface">{totalDeliveries}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">On-Time Rate</p>
                <p className="text-lg font-semibold text-success-green">
                  98.5%
                </p>
              </div>
            </div>
            <button className="w-full mt-6 bg-surface-white border border-secondary-container text-on-surface text-sm font-medium py-3 rounded-lg hover:bg-surface-container-low shadow-sm transition-colors">
              Contact Driver
            </button>
          </div>

          <div className="col-span-12 md:col-span-8 flex flex-col gap-4 md:gap-6">
            <div className="bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim rounded-xl p-6 flex flex-col sm:flex-row items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 bg-surface-white rounded-full shadow-sm text-primary">
                  <span
                    className="material-symbols-outlined text-4xl"
                    style={FILLED_ICON_STYLE}
                  >
                    star
                  </span>
                </div>
                <div>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl md:text-4xl font-bold leading-none">
                      {ratingAvg > 0 ? ratingAvg.toFixed(1) : "—"}
                    </h3>
                    <span className="text-sm text-on-primary-fixed/80 mb-1">/ 5.0</span>
                  </div>
                  <p className="text-sm mt-1 text-on-primary-fixed/80">Average Rating</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-lg font-semibold">{ratingCount} Reviews</p>
                {ratingCount > 0 && (
                  <p className="text-xs mt-1 text-on-primary-fixed/80">
                    96% 5-star ratings
                  </p>
                )}
              </div>
            </div>

            <div className="bg-surface-white border border-secondary-container rounded-xl p-6 shadow-sm flex-grow">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-on-surface">Recent Feedback</h3>
                <button className="text-primary text-sm font-medium hover:underline">
                  View All
                </button>
              </div>
              {reviewsContent}
            </div>
          </div>
        </div>
      </main>
  );
}
