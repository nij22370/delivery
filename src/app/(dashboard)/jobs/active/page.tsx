"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { JOB_STATUS } from "@/types/job";
import { apiFetch } from "@/utils/apiFetch";

const ACTIVE_JOB_STATUSES = [JOB_STATUS.ACCEPTED, JOB_STATUS.IN_TRANSIT];
const MY_ACTIVE_IDS_ENDPOINT = "/api/jobs/my-active-ids";
const JOBS_ENDPOINT = "/api/jobs";
const QUERY_KEY_ACTIVE_JOBS = "active-jobs";

interface ActiveJob {
  _id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  offeredPrice: number;
  pickupDate: string;
  pickupTimeWindow: string;
  createdAt: string;
}

interface MyActiveIdsResponse {
  jobIds: string[];
}

interface JobDetailResponse {
  job: ActiveJob;
}

function formatShortAddress(address: string): string {
  return address.split(",")[0] ?? address;
}

function StatusBadge({ status }: { status: string }) {
  const badgeClass =
    status === JOB_STATUS.ACCEPTED
      ? "bg-primary-container text-on-primary-container"
      : "bg-success-green/10 text-success-green";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}
    >
      <span className="material-symbols-outlined text-xs">
        {status === JOB_STATUS.ACCEPTED ? "local_shipping" : "directions_car"}
      </span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function JobCardSkeleton() {
  return (
    <div className="bg-surface-white border border-outline-variant rounded-lg p-5 animate-pulse">
      <div className="flex justify-between items-start gap-4 mb-3">
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

function ActiveJobCard({ job }: { job: ActiveJob }) {
  const pickupShort = formatShortAddress(job.pickupAddress);
  const dropoffShort = formatShortAddress(job.dropoffAddress);

  return (
    <div className="bg-surface-white border border-outline-variant rounded-lg hover:border-primary/40 hover:shadow-sm transition-all group">
      <div className="p-5">
        <div className="flex justify-between items-start gap-4 mb-3">
          <p className="text-xs text-on-surface-variant">
            {job.pickupDate} · {job.pickupTimeWindow}
          </p>
          <p className="text-xl font-bold text-on-surface shrink-0">
            NPR {job.offeredPrice.toLocaleString("en-NP")}
          </p>
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <p className="text-sm font-semibold text-on-surface">
            {pickupShort}{" "}
            <span className="font-normal text-on-surface-variant">Pickup</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success-green shrink-0" />
          <p className="text-sm text-on-surface-variant">
            {dropoffShort}{" "}
            <span className="text-on-surface-variant">Dropoff</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40 bg-surface-container-low rounded-b-lg">
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />
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

async function fetchActiveJobs(): Promise<ActiveJob[]> {
  const idsResponse = await apiFetch(MY_ACTIVE_IDS_ENDPOINT);
  if (!idsResponse.ok) {
    throw new Error("Failed to fetch active job IDs");
  }
  const idsData = (await idsResponse.json()) as MyActiveIdsResponse;
  if (!idsData.jobIds || idsData.jobIds.length === 0) {
    return [];
  }

  const jobResponses = await Promise.all(
    idsData.jobIds.map((jobId) => apiFetch(`${JOBS_ENDPOINT}/${jobId}`))
  );

  const jobs: ActiveJob[] = [];
  for (const response of jobResponses) {
    if (response.ok) {
      const data = (await response.json()) as JobDetailResponse;
      if (data.job) {
        jobs.push(data.job as ActiveJob);
      }
    }
  }
  return jobs;
}

export default function ActiveJobsPage() {
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const {
    data: jobs,
    isLoading,
    isError,
  } = useQuery<ActiveJob[], Error>({
    queryKey: [QUERY_KEY_ACTIVE_JOBS],
    queryFn: fetchActiveJobs,
    staleTime: 30_000,
    enabled: !!user,
  });

  if (isAuthLoading || isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 flex flex-col gap-6 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <JobCardSkeleton key={idx} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8">
        <p className="text-error-red font-medium">Failed to load active jobs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 flex flex-col gap-6 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-on-surface">Active Deliveries</h1>
      </div>

      {jobs && jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <ActiveJobCard key={job._id} job={job} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30">
            local_shipping
          </span>
          <h3 className="text-lg font-semibold text-on-surface">No active deliveries</h3>
          <p className="text-sm text-on-surface-variant max-w-md">
            You have no jobs currently in accepted or in-transit status. Check back later for
            new deliveries.
          </p>
          <Link
            href="/jobs/browse"
            className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Browse Available Jobs
          </Link>
        </div>
      )}
    </div>
  );
}
