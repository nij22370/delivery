"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import dynamic from "next/dynamic";
import { JOB_VEHICLE_TYPE, JOB_STATUS } from "@/types/job";
import type { JobVehicleType } from "@/types/job";
import { DRIVER_PROFILE_STATUS } from "@/types/driverProfile/driverProfile";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useDriverVerification } from "@/api/hooks/drivers/driversApi";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/utils/apiFetch";

// ── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const JOBS_QUERY_KEY = "browse-jobs";
const BROWSE_ENDPOINT = "/api/jobs";
const POSTER_ROLE = "poster";
const DASHBOARD_PATH = "/dashboard";
const MIN_PAYOUT_MIN = 0;
const MIN_PAYOUT_MAX = 5000;
const MIN_PAYOUT_STEP = 100;
const MIN_PAYOUT_DEFAULT = 0;
const VERIFICATION_PENDING_BANNER_MESSAGE =
  "Your account is pending verification. You cannot accept jobs until approved.";
const VERIFICATION_LINK_HREF = "/driver/verification";
const EMPTY_VEHICLE_TYPE_MESSAGE = "No jobs available for your vehicle type.";
const EMPTY_GENERIC_MESSAGE =
  "There are no open jobs matching your current filters. Try adjusting the vehicle type or minimum payout.";

const DISTANCE_RADIUS_OPTIONS = [
  "Within 5 miles",
  "Within 10 miles",
  "Within 25 miles",
  "Within 50 miles",
  "Any distance",
] as const;

const VEHICLE_LABELS: Record<JobVehicleType, string> = {
  bike: "Bike",
  car: "Sedan",
  van: "Cargo Van",
  truck: "Truck",
};

const VEHICLE_ICONS: Record<JobVehicleType, string> = {
  bike: "pedal_bike",
  car: "directions_car",
  van: "local_shipping",
  truck: "fire_truck",
};

const MapPreview = dynamic(() => import("@/components/MapPreview"), { ssr: false });

// ── Types ────────────────────────────────────────────────────────────────────
interface JobListing {
  _id: string;
  pickupAddress: string;
  dropoffAddress: string;
  vehicleType: JobVehicleType;
  offeredPrice: number;
  pickupDate: string;
  pickupTimeWindow: string;
  status: string;
  createdAt: string;
}

interface JobsApiResponse {
  jobs: JobListing[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Fetcher ──────────────────────────────────────────────────────────────────
async function fetchBrowseJobs(
  page: number,
  selectedVehicleTypes: JobVehicleType[],
  minPayoutNpr: number
): Promise<JobsApiResponse> {
  const params = new URLSearchParams({
    status: JOB_STATUS.POSTED,
    page: String(page),
    limit: String(PAGE_SIZE),
  });

  const response = await apiFetch(`${BROWSE_ENDPOINT}?${params}`);
  if (!response.ok) {
    throw new Error("Failed to load jobs. Please try again.");
  }
  const data: JobsApiResponse = await response.json();

  let filteredJobs = data.jobs;

  if (selectedVehicleTypes.length > 0) {
    filteredJobs = filteredJobs.filter((job) =>
      selectedVehicleTypes.includes(job.vehicleType)
    );
  }

  if (minPayoutNpr > 0) {
    filteredJobs = filteredJobs.filter((job) => job.offeredPrice >= minPayoutNpr);
  }

  return { ...data, jobs: filteredJobs };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatShortAddress(address: string): string {
  return address.split(",")[0] ?? address;
}

// ── Sub-Components ───────────────────────────────────────────────────────────
function JobCardSkeleton() {
  return (
    <div className="bg-surface-white border border-outline-variant rounded-lg p-5 animate-pulse">
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-3 bg-surface-container-high rounded w-36" />
          <div className="h-4 bg-surface-container-high rounded w-48 mt-1" />
          <div className="h-3 bg-surface-container rounded w-40" />
        </div>
        <div className="h-7 bg-surface-container-high rounded w-20 shrink-0" />
      </div>
      <div className="flex gap-3 pt-3 border-t border-outline-variant/30">
        <div className="h-3 bg-surface-container rounded w-20" />
        <div className="h-3 bg-surface-container rounded w-16" />
        <div className="h-3 bg-surface-container rounded w-16" />
      </div>
    </div>
  );
}

function JobCard({ job }: { job: JobListing }) {
  const pickupShort = formatShortAddress(job.pickupAddress);
  const dropoffShort = formatShortAddress(job.dropoffAddress);
  const vehicleLabel = VEHICLE_LABELS[job.vehicleType];
  const vehicleIcon = VEHICLE_ICONS[job.vehicleType];

  return (
    <div className="bg-surface-white border border-outline-variant rounded-lg hover:border-primary/40 hover:shadow-sm transition-all group">
      <div className="p-5">
        {/* Header row: time + price */}
        <div className="flex justify-between items-start gap-4 mb-3">
          <p className="text-xs text-on-surface-variant">
            {job.pickupDate} · {job.pickupTimeWindow}
          </p>
          <p className="text-xl font-bold text-on-surface shrink-0">
            NPR {job.offeredPrice.toLocaleString("en-NP")}
          </p>
        </div>

        {/* Pickup */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <p className="text-sm font-semibold text-on-surface">
            {pickupShort}{" "}
            <span className="font-normal text-on-surface-variant">Pickup</span>
          </p>
        </div>

        {/* Dropoff */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success-green shrink-0" />
          <p className="text-sm text-on-surface-variant">
            {dropoffShort}{" "}
            <span className="text-on-surface-variant">Dropoff</span>
          </p>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40 bg-surface-container-low rounded-b-lg">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded-full">
            <span className="material-symbols-outlined text-sm">{vehicleIcon}</span>
            {vehicleLabel} Req.
          </span>
        </div>
        <Link
          href={`/jobs/${job._id}`}
          className="text-xs font-semibold text-primary hover:text-primary-container transition-colors cursor-pointer ml-3 shrink-0"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

// ── Filters Sidebar ──────────────────────────────────────────────────────────
interface FiltersSidebarProps {
  selectedVehicleTypes: JobVehicleType[];
  onVehicleTypeToggle: (vehicleType: JobVehicleType) => void;
  distanceRadius: string;
  onDistanceRadiusChange: (value: string) => void;
  minPayoutNpr: number;
  onMinPayoutChange: (value: number) => void;
}

function FiltersSidebar({
  selectedVehicleTypes,
  onVehicleTypeToggle,
  distanceRadius,
  onDistanceRadiusChange,
  minPayoutNpr,
  onMinPayoutChange,
}: FiltersSidebarProps) {
  return (
    <aside className="w-full lg:w-56 shrink-0">
      <div className="bg-surface-white border border-outline-variant rounded-lg p-5 sticky top-4">
        <h2 className="text-sm font-semibold text-on-surface mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">filter_list</span>
          Filters
        </h2>

        {/* Vehicle Requirement */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-3">
            Vehicle Requirement
          </h3>
          <div className="flex flex-col gap-2.5">
            {Object.values(JOB_VEHICLE_TYPE).map((vehicleType) => {
              const isChecked = selectedVehicleTypes.includes(vehicleType);
              return (
                <label
                  key={vehicleType}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onVehicleTypeToggle(vehicleType)}
                    className="w-4 h-4 accent-primary cursor-pointer rounded"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">
                      {VEHICLE_ICONS[vehicleType]}
                    </span>
                    <span className="text-sm text-on-surface group-hover:text-primary transition-colors">
                      {VEHICLE_LABELS[vehicleType]}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Distance Radius */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-3">
            Distance (Radius)
          </h3>
          <div className="relative">
            <select
              id="browse-distance-radius"
              value={distanceRadius}
              onChange={(e) => onDistanceRadiusChange(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-sm border border-outline-variant rounded-lg bg-surface-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
            >
              {DISTANCE_RADIUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-on-surface-variant pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        {/* Minimum Payout */}
        <div>
          <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-3">
            Minimum Payout
          </h3>
          <input
            type="range"
            id="browse-min-payout"
            min={MIN_PAYOUT_MIN}
            max={MIN_PAYOUT_MAX}
            step={MIN_PAYOUT_STEP}
            value={minPayoutNpr}
            onChange={(e) => onMinPayoutChange(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-on-surface-variant">NPR 0</span>
            <span className="text-xs font-semibold text-on-surface">
              {minPayoutNpr === 0 ? "No minimum" : `Min NPR ${minPayoutNpr.toLocaleString("en-NP")}`}
            </span>
            <span className="text-xs text-on-surface-variant">NPR {MIN_PAYOUT_MAX.toLocaleString("en-NP")}+</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function BrowseJobsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  useEffect(() => {
    if (!isAuthLoading && user?.role === POSTER_ROLE) {
      router.replace(DASHBOARD_PATH);
    }
  }, [isAuthLoading, user, router]);

  const isDriver = !isAuthLoading && user?.role !== POSTER_ROLE;
  const [page, setPage] = useState(1);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<JobVehicleType[]>([]);
  const [distanceRadius, setDistanceRadius] = useState<string>(DISTANCE_RADIUS_OPTIONS[1]);
  const [minPayoutNpr, setMinPayoutNpr] = useState(MIN_PAYOUT_DEFAULT);

  const { data: verificationData } = useDriverVerification();
  const driverProfile = verificationData?.profile;
  const driverVerificationStatus = driverProfile?.status;
  const isVerificationPending =
    isDriver &&
    driverVerificationStatus !== undefined &&
    driverVerificationStatus !== DRIVER_PROFILE_STATUS.APPROVED;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [JOBS_QUERY_KEY, page, selectedVehicleTypes, minPayoutNpr],
    queryFn: () => fetchBrowseJobs(page, selectedVehicleTypes, minPayoutNpr),
    enabled: isDriver,
  });

  const handleVehicleTypeToggle = useCallback((vehicleType: JobVehicleType) => {
    setSelectedVehicleTypes((previous) =>
      previous.includes(vehicleType)
        ? previous.filter((type) => type !== vehicleType)
        : [...previous, vehicleType]
    );
    setPage(1);
  }, []);

  const handleDistanceRadiusChange = useCallback((value: string) => {
    setDistanceRadius(value);
  }, []);

  const handleMinPayoutChange = useCallback((value: number) => {
    setMinPayoutNpr(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // First job's locations for the map preview
  const mapPickupAddress = data?.jobs[0]?.pickupAddress ?? "";
  const mapDropoffAddress = data?.jobs[0]?.dropoffAddress ?? "";

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">
            Available Jobs
          </h1>
          {data && (
            <p className="text-sm text-on-surface-variant mt-1">
              {data.total} active listing{data.total !== 1 ? "s" : ""} in your area
            </p>
          )}
        </div>

        {isVerificationPending && (
          <div
            role="status"
            data-testid="driver-verification-pending-banner"
            className="mb-6 flex items-start gap-3 rounded-xl border border-warning-amber/40 bg-warning-amber/10 p-4"
          >
            <span className="material-symbols-outlined text-warning-amber text-2xl shrink-0">
              hourglass_top
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-on-surface">
                {VERIFICATION_PENDING_BANNER_MESSAGE}
              </p>
              <Link
                href={VERIFICATION_LINK_HREF}
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Complete verification
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </div>
        )}

        {/* Three-column layout: Filters | Jobs | Map */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters */}
          <FiltersSidebar
            selectedVehicleTypes={selectedVehicleTypes}
            onVehicleTypeToggle={handleVehicleTypeToggle}
            distanceRadius={distanceRadius}
            onDistanceRadiusChange={handleDistanceRadiusChange}
            minPayoutNpr={minPayoutNpr}
            onMinPayoutChange={handleMinPayoutChange}
          />

          {/* Job Listings */}
          <div className="flex-1 min-w-0">
            {/* Loading */}
            {isLoading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }, (_, skeletonIndex) => (
                  <JobCardSkeleton key={skeletonIndex} />
                ))}
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="bg-surface-white border border-error-red/30 rounded-lg p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-error-red mb-3 block">
                  error_outline
                </span>
                <h2 className="text-base font-semibold text-on-surface mb-2">
                  Failed to load jobs
                </h2>
                <p className="text-sm text-on-surface-variant">
                  {error instanceof Error ? error.message : "Please try again later."}
                </p>
              </div>
            )}

            {/* Empty */}
            {!isLoading && !isError && data?.jobs.length === 0 && (
              <div className="bg-surface-white border border-outline-variant rounded-lg p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4 block">
                  work_off
                </span>
                <h2 className="text-lg font-semibold text-on-surface mb-2">
                  No jobs available
                </h2>
                <p className="text-sm text-on-surface-variant max-w-sm mx-auto mb-4">
                  {selectedVehicleTypes.length === 0
                    ? EMPTY_VEHICLE_TYPE_MESSAGE
                    : EMPTY_GENERIC_MESSAGE}
                </p>
                {selectedVehicleTypes.length > 0 && (
                  <button
                    onClick={() => { setSelectedVehicleTypes([]); setPage(1); }}
                    className="text-sm text-primary font-medium hover:underline cursor-pointer"
                  >
                    Clear vehicle filter
                  </button>
                )}
              </div>
            )}

            {/* Cards */}
            {!isLoading && !isError && data && data.jobs.length > 0 && (
              <>
                <div className="flex flex-col gap-3">
                  {data.jobs.map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-outline-variant/50">
                    <p className="text-sm text-on-surface-variant">
                      Page {data.page} of {data.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(data.page - 1)}
                        disabled={data.page <= 1}
                        className="px-4 py-2 text-sm font-medium border border-outline-variant rounded-lg hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(data.page + 1)}
                        disabled={data.page >= data.totalPages}
                        className="px-4 py-2 text-sm font-medium border border-outline-variant rounded-lg hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Map Panel */}
          <aside className="hidden lg:block w-[340px] shrink-0">
            <div className="sticky top-4 bg-surface-white border border-outline-variant rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/50">
                <span className="text-xs font-semibold text-on-surface">Current View</span>
              </div>
              <div className="h-[520px] relative">
                {data && data.jobs.length > 0 ? (
                  <MapPreview
                    pickupAddress={mapPickupAddress}
                    dropoffAddress={mapDropoffAddress}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-container-low">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant block mb-2">
                        map
                      </span>
                      <p className="text-xs text-on-surface-variant">
                        Map will show job locations
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
