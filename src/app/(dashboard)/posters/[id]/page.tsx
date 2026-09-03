"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserPublicProfile } from "@/api/hooks/users/userPublicProfileApi";
import { getInitials } from "@/utils/format";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const SHORT_ID_CHARS = 4;
const DASHBOARD_PATH = "/dashboard";
const DRIVER_ROLE = "driver";

export default function PosterProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  useEffect(() => {
    if (!isAuthLoading && user?.role === DRIVER_ROLE) {
      router.replace(DASHBOARD_PATH);
    }
  }, [isAuthLoading, user, router]);

  const isPoster = !isAuthLoading && user?.role !== DRIVER_ROLE;

  const {
    data,
    isLoading,
    isError,
  } = useUserPublicProfile(isPoster ? id : null);

  const memberSince = useMemo(() => {
    const createdAt = data?.user?.createdAt;
    if (!createdAt) return "";
    const date = new Date(createdAt);
    return date.toLocaleDateString("en-US", { year: "numeric" });
  }, [data?.user?.createdAt]);

  const shortId = useMemo(
    () => `PST-${id.slice(-SHORT_ID_CHARS).toUpperCase()}`,
    [id]
  );

  const totalJobsPosted = data?.totalJobsPosted ?? 0;
  const averageRatingGiven = data?.averageRatingGiven ?? 0;
  const ratingDisplay = averageRatingGiven > 0 ? averageRatingGiven.toFixed(1) : "N/A";

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (isError || !data?.user) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-5xl text-error-red mb-4 block">
            error_outline
          </span>
          <h1 className="text-xl font-semibold text-on-surface mb-2">Poster Not Found</h1>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-primary hover:underline cursor-pointer"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const posterName = data.user.name;

  return (
    <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard"
          className="w-12 h-12 flex items-center justify-center border border-secondary-container rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Poster Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 md:col-span-4 bg-surface-white border border-secondary-container rounded-xl p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-surface-container-high -z-0" />
          <div className="relative z-10 mt-6 mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-surface-white bg-primary-container/15 flex items-center justify-center shadow-sm">
              <span className="text-3xl font-bold text-primary">
                {getInitials(posterName)}
              </span>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-on-surface mb-1">{posterName}</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-on-surface-variant">ID: {shortId}</span>
            <span className="w-1 h-1 bg-secondary rounded-full" />
            <span className="text-sm text-on-surface-variant">
              Member since {memberSince}
            </span>
          </div>
          <div className="flex gap-2 mb-6">
            <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">inventory_2</span>
              Poster
            </span>
          </div>
          <div className="w-full h-[1px] bg-secondary-container mb-6" />
          <div className="grid grid-cols-2 gap-4 w-full text-left">
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Total Jobs Posted</p>
              <p className="text-lg font-semibold text-on-surface">{totalJobsPosted}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Avg Rating Given</p>
              <p className="text-lg font-semibold text-warning-amber">
                {ratingDisplay}
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-8 flex flex-col gap-4 md:gap-6">
          <div className="bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim rounded-xl p-6 flex flex-col sm:flex-row items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 bg-surface-white rounded-full shadow-sm text-primary">
                <span className="material-symbols-outlined text-4xl">inventory_2</span>
              </div>
              <div>
                <h3 className="text-3xl md:text-4xl font-bold leading-none">
                  {totalJobsPosted}
                </h3>
                <p className="text-sm mt-1 text-on-primary-fixed/80">Jobs Posted to Date</p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-lg font-semibold">{ratingDisplay} / 5.0</p>
              <p className="text-xs mt-1 text-on-primary-fixed/80">Average Rating Given</p>
            </div>
          </div>

          <div className="bg-surface-white border border-secondary-container rounded-xl p-6 shadow-sm flex-grow">
            <h3 className="text-lg font-semibold text-on-surface mb-2">About this Poster</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              This is a verified SwiftShip poster. Active posters can post delivery jobs and
              rate drivers after completed deliveries.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
