"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { JOB_STATUS } from "@/types/job";
import { formatShortDate } from "@/utils/format";
import { apiFetch } from "@/utils/apiFetch";

const MY_ACTIVE_IDS_ENDPOINT = "/api/jobs/my-active-ids";
const JOBS_ENDPOINT = "/api/jobs";
const STATUS_BADGE_CLASSES: Record<string, string> = {
  [JOB_STATUS.ACCEPTED]: "bg-success-green/10 text-success-green",
  [JOB_STATUS.IN_TRANSIT]: "bg-warning-amber/10 text-warning-amber",
};

interface ActiveJob {
  _id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  offeredPrice: number;
  driverId: string | null;
  createdAt: string;
}

interface MyActiveIdsResponse {
  jobIds: string[];
}

interface JobDetailResponse {
  job: ActiveJob;
}

interface TableRow {
  jobId: string;
  pickupShort: string;
  dropoffShort: string;
  status: string;
  driverName: string;
  date: string;
}

function formatShortAddress(address: string): string {
  return address.split(",")[0] ?? address;
}

function StatusBadge({ status }: { status: string }) {
  const className = STATUS_BADGE_CLASSES[status] ?? "bg-surface-container text-secondary";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${className}`}
    >
      {status === JOB_STATUS.IN_TRANSIT ? "In Transit" : "Accepted"}
    </span>
  );
}

function RowSkeleton() {
  return (
    <tr className="border-b border-outline-variant">
      <td className="px-6 py-4"><div className="h-4 bg-surface-container-high rounded w-20 animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-surface-container-high rounded w-48 animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-surface-container-high rounded w-24 animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-surface-container-high rounded w-20 animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-surface-container-high rounded w-28 animate-pulse" /></td>
    </tr>
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
        jobs.push(data.job);
      }
    }
  }
  return jobs;
}

export default function TrackingPage() {
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  const {
    data: activeJobs,
    isLoading,
    isError,
  } = useQuery<ActiveJob[], Error>({
    queryKey: ["tracking-active-jobs"],
    queryFn: fetchActiveJobs,
    enabled: !!user,
    staleTime: 30_000,
  });

  const tableRows = useMemo<TableRow[]>(() => {
    if (!activeJobs) return [];
    return activeJobs.map((job) => ({
      jobId: job._id.slice(-6).toUpperCase(),
      pickupShort: formatShortAddress(job.pickupAddress),
      dropoffShort: formatShortAddress(job.dropoffAddress),
      status: job.status,
      driverName: job.driverId
        ? `#${job.driverId.slice(-6).toUpperCase()}`
        : "Not assigned",
      date: formatShortDate(job.createdAt),
    }));
  }, [activeJobs]);

  const isJobsEmpty = !isLoading && tableRows.length === 0;

  if (isAuthLoading || isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse mb-6" />
        <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-surface-container-low text-secondary uppercase font-semibold text-xs border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {Array.from({ length: 4 }).map((_, idx) => (
                <RowSkeleton key={idx} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (isError) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <p className="text-error-red font-medium">Failed to load active deliveries.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-on-surface">Tracking</h1>

      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-container-low text-secondary uppercase font-semibold text-xs border-b border-outline-variant">
            <tr>
              <th className="px-6 py-4">Job ID</th>
              <th className="px-6 py-4">Route</th>
              <th className="px-6 py-4">Driver</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isJobsEmpty ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-secondary">
                  No active deliveries to track.
                </td>
              </tr>
            ) : (
              tableRows.map((row) => (
                <tr key={row.jobId} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4 font-bold text-primary">
                    <Link
                      href={`/jobs/${row.jobId}`}
                      className="hover:text-primary-container transition-colors cursor-pointer"
                    >
                      #{row.jobId}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-secondary">
                    {row.pickupShort} → {row.dropoffShort}
                  </td>
                  <td className="px-6 py-4 text-secondary">{row.driverName}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-6 py-4 text-secondary">{row.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
